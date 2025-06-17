const express = require("express");
const { chromium } = require("playwright");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
// app.use(cors()); // Allow cross-origin requests
app.use(
  cors({
    origin: '*',  // Allow all origins
    credentials: true, // Allow credentials (cookies, Authorization headers, etc.)
  })
);

app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, "public"))); // Serve frontend static files

let scrapedData = [];
let isScrapingCancelled = false;

// Helper Functions (copied from main.js)
function validateCarName(carName) {
  const invalidChars = /[^a-zA-Z0-9\s-]/g;
  if (!carName || carName.length < 2) {
    return {
      valid: false,
      message: `Car name "${carName}" must be at least 2 characters long`,
    };
  }
  if (invalidChars.test(carName)) {
    return {
      valid: false,
      message: `Car name "${carName}" contains invalid characters. Use letters, numbers, spaces, or hyphens only.`,
    };
  }
  return { valid: true };
}

function formatCarNameForUrl(carName) {
  return carName.toLowerCase().replace(/\s+/g, "/");
}

function formatCarNameForFile(carName) {
  return carName.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
}

async function scrollPage(page) {
  let lastHeight = await page.evaluate(() => document.body.scrollHeight);
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(5000);
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === lastHeight) {
      attempts++;
    } else {
      attempts = 0;
      lastHeight = newHeight;
    }
    if (isScrapingCancelled) throw new Error("Scraping cancelled by user");
  }
}

async function scrapeCarData(
  page,
  carName,
  periodName,
  selectors,
  durationHours,
  isMonthly
) {
  try {
    await page.waitForSelector(selectors.title, { timeout: 3000 });
    await page.waitForSelector(selectors.features, { timeout: 3000 });
    await page.waitForSelector(selectors.price, { timeout: 3000 });

    let results = [];
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      results = await page.evaluate(
        ({ carName, periodName, selectors, durationHours, isMonthly }) => {
          const results = [];
          const carElements = document.querySelectorAll(selectors.title);
          const featureDivs = document.querySelectorAll(selectors.features);
          const priceDivs = document.querySelectorAll(selectors.price);

          console.log(
            `Found ${carElements.length} cars for ${carName} (${periodName})`
          );

          carElements.forEach((carElement, index) => {
            const data = {};
            const carNameText = carElement.textContent.trim();
            data["Car Name"] = carNameText || "N/A";

            const ancestorContainer = carElement.closest("div");
            if (!ancestorContainer) return;

            const modelElement = ancestorContainer.querySelector(
              selectors.model
            );
            const modelText = modelElement
              ? modelElement.textContent.trim()
              : "N/A";
            data["Model"] = modelText;
            const yearMatch = modelText.match(/\d{4}/);
            data["Year"] = yearMatch ? yearMatch[0] : "N/A";

            const featureDiv = featureDivs[index];
            if (featureDiv) {
              const spanElements = featureDiv.querySelectorAll(
                selectors.featureSpans
              );
              const featureTexts = Array.from(spanElements)
                .map((span) => span.textContent.trim())
                .filter((text) => text);
              data["Description"] =
                featureTexts.length > 0 ? featureTexts.join(", ") : "N/A";
              data["Description"] =
                data["Description"] === "N/A"
                  ? data["Description"]
                  : data["Description"].replace(/\s+/g, " ").trim();
            } else {
              data["Description"] = "N/A";
            }

            const priceDiv = priceDivs[index];
            if (priceDiv) {
              const pElements = priceDiv.querySelectorAll("p");
              const spanElements = priceDiv.querySelectorAll("span");
              data["Cross Price"] = pElements[0]
                ? pElements[0].textContent.trim()
                : "N/A";
              data["Actual Price"] = pElements[1]
                ? pElements[1].textContent.trim()
                : "N/A";
              if (durationHours > 24 && !isMonthly && spanElements[2]) {
                data["Total"] = spanElements[2].textContent.trim() || "N/A";
              } else {
                data["Total"] = "N/A";
              }
            } else {
              data["Cross Price"] = "N/A";
              data["Actual Price"] = "N/A";
              data["Total"] = "N/A";
            }

            data["Original Vehicle"] = carName;
            data["Period"] = periodName;

            if (Object.keys(data).length > 0) {
              results.push(data);
            }
          });
          return results;
        },
        { carName, periodName, selectors, durationHours, isMonthly }
      );

      if (results.length > 0) break;
      console.log(
        `Retrying scrape for ${carName} (${periodName}), attempt ${
          retryCount + 1
        }`
      );
      await scrollPage(page);
      retryCount++;
    }

    if (results.length === 0) {
      console.log(
        `No data scraped for ${carName} (${periodName}) after ${maxRetries} retries`
      );
      return {
        success: false,
        message: `No data found for ${carName} (${periodName})`,
        data: [],
      };
    }

    return { success: true, data: results };
  } catch (error) {
    let message = error.message;
    if (error.message.includes("Timeout")) {
      message = "First check on website for car name on Yango drive ";
    } else if (error.message.includes("cancelled")) {
      message = "Scraping was cancelled by the user.";
    }
    console.error(
      `Error scraping data for ${carName} (${periodName}):`,
      message
    );
    return { success: false, message, data: [] };
  }
}

async function scrapeCars(carNames, sinceDateTime, untilDateTime, months) {
  const errors = [];
  for (const carName of carNames) {
    const validation = validateCarName(carName);
    if (!validation.valid) {
      errors.push(validation.message);
    }
  }
  if (errors.length > 0) {
    return { success: false, message: errors.join("; ") };
  }

  let sinceTime,
    untilTime,
    durationHours,
    isMonthly,
    periodName,
    durationMonths;
  const now = new Date();

  if (months && months > 0) {
    isMonthly = true;
    durationMonths = months;
    sinceTime = now.getTime();
    const untilDate = new Date(now);
    untilDate.setMonth(now.getMonth() + months);
    untilTime = untilDate.getTime();
    durationHours = (untilTime - sinceTime) / (1000 * 60 * 60);
    periodName = `${months} Month${months > 1 ? "s" : ""}`;
  } else {
    sinceTime = new Date(sinceDateTime).getTime();
    untilTime = new Date(untilDateTime).getTime();
    durationHours = (untilTime - sinceTime) / (1000 * 60 * 60);
    isMonthly = durationHours >= 720;
    durationMonths = isMonthly ? Math.ceil(durationHours / 720) : 0;
    periodName = isMonthly
      ? `${durationMonths} Month${durationMonths > 1 ? "s" : ""}`
      : `${new Date(sinceTime).toLocaleString()} - ${new Date(
          untilTime
        ).toLocaleString()}`;
  }

  if (sinceTime < now.getTime()) {
    return {
      success: false,
      message: "Since date and time cannot be in the past",
    };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  });

  const selectors = {
    title: 'span[class*="Card_CardTitleMedium__korrS"]',
    features:
      'div[class*="HStack_HStack__bHoaj Card_CardBubbles__zuOuw HStack_gap__ml__UeOp6"]',
    price:
      'div[class*="Heading_Heading__PjLg8 Card_CardPrice__spWUR Heading_left__Xd02k"]',
    model: 'span[class*="ButtonSimilarInfo_ButtonSimilarInfoPrefix___Qou3"]',
    featureSpans:
      'span[class*="Text_Text__F4Wpv Card_CardBubble__zukT3 Text_color_Gray__1IX1U"]',
  };

  scrapedData = [];
  let captchaDetected = false;

  try {
    for (const carName of carNames) {
      if (isScrapingCancelled) {
        return { success: false, message: "Scraping cancelled" };
      }

      const formattedCarName = formatCarNameForUrl(carName.toLowerCase());

      const captchaPage = await context.newPage();
      await captchaPage.goto(
        `https://drive.yango.com/search/all/${formattedCarName}`,
        {
          waitUntil: "domcontentloaded",
          timeout: 50000,
        }
      );
      const captcha = await captchaPage.evaluate(
        () =>
          !!document.querySelector(
            'iframe[src*="captcha"], div[id*="captcha"], [class*="captcha"]'
          )
      );
      if (captcha) {
        captchaDetected = true;
        await captchaPage.close();
        throw new Error(
          `CAPTCHA detected for ${carName}. Manual intervention required.`
        );
      }
      await captchaPage.close();

      const page = await context.newPage();
      try {
        const url = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceTime}&until=${untilTime}&duration_months=${
          isMonthly ? durationMonths : 0
        }${isMonthly ? "&is_monthly=true" : ""}&sort_by=price&sort_order=asc`;
        console.log(`Navigating to URL: ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 50000 });
        await scrollPage(page);
        const result = await scrapeCarData(
          page,
          carName,
          periodName,
          selectors,
          durationHours,
          isMonthly
        );
        if (result.success) {
          console.log(
            `Scraped ${result.data.length} items for ${carName} (${periodName})`
          );
          scrapedData = scrapedData.concat(result.data);
        } else {
          errors.push(
            `Failed to scrape ${carName} (${periodName}): ${result.message}`
          );
        }
      } catch (error) {
        errors.push(
          `Failed to scrape ${carName} (${periodName}): ${error.message}`
        );
      } finally {
        await page.close();
      }
    }

    if (captchaDetected) {
      return {
        success: false,
        message:
          "CAPTCHA detected on the website. Manual intervention required.",
      };
    }

    if (scrapedData.length === 0) {
      return {
        success: false,
        message:
          errors.length > 0
            ? errors.join("; ")
            : "No data scraped. Check car names or website availability.",
      };
    }

    return {
      success: true,
      message:
        errors.length > 0
          ? `Scraping completed with errors: ${errors.join("; ")}`
          : "Scraping completed successfully.",
      data: scrapedData,
    };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    await context.close();
    await browser.close();
  }
}

// API Endpoints
app.post("/api/scrape", async (req, res) => {
  const { carNames, sinceDateTime, untilDateTime, months } = req.body;
  isScrapingCancelled = false;
  const result = await scrapeCars(
    carNames,
    sinceDateTime,
    untilDateTime,
    months
  );
  res.json(result);
});

app.post("/api/cancel-scrape", (req, res) => {
  isScrapingCancelled = true;
  res.json({ success: true, message: "Scraping cancellation requested." });
});

app.get("/api/years", (req, res) => {
  const years = [
    ...new Set(
      scrapedData.map((item) => item.Year).filter((year) => year !== "N/A")
    ),
  ].sort();
  res.json(years);
});

app.get("/api/car-names", (req, res) => {
  const carNames = [
    ...new Set(scrapedData.map((item) => item["Car Name"])),
  ].sort();
  res.json(carNames);
});

app.post("/api/download-excel", async (req, res) => {
  let { carNames, year } = req.body;
  let filteredData = scrapedData;
  if (carNames && carNames.length > 0 && carNames[0] !== "") {
    filteredData = filteredData.filter((item) =>
      carNames.includes(item["Car Name"])
    );
  }
  if (year) filteredData = filteredData.filter((item) => item.Year === year);

  if (filteredData.length === 0) {
    return res
      .status(400)
      .json({
        success: false,
        message: "No data matches the selected filters",
      });
  }

  const worksheet = xlsx.utils.json_to_sheet(filteredData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Car Data");

  let fileNameParts = [];
  if (carNames && carNames.length > 0 && carNames[0] !== "") {
    fileNameParts.push(carNames.map(formatCarNameForFile).join("_"));
  } else {
    fileNameParts.push("all_cars");
  }
  if (year) fileNameParts.push(year);
  const timestamp = Date.now();
  const fileName = `car_data_${fileNameParts.join("_")}_${timestamp}.xlsx`;

  // Ensure temp directory exists
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const filePath = path.join(tempDir, fileName);
  xlsx.writeFile(workbook, filePath);

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to download file" });
    }
    // Clean up the file
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
