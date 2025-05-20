const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { chromium } = require("playwright");
const xlsx = require("xlsx");
const { execSync } = require("child_process");

let scrapedData = [];
let isScrapingCancelled = false;

// Utility to validate car names
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
  while (true) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1500);
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === lastHeight) break;
    lastHeight = newHeight;
    if (isScrapingCancelled) throw new Error("Scraping cancelled by user");
  }
}

async function scrapeCarData(page, carName, periodName, selectors) {
  try {
    await page.waitForSelector(selectors.title, { timeout: 30000 });
    await page.waitForSelector(selectors.features, { timeout: 30000 });
    await page.waitForSelector(selectors.price, { timeout: 30000 });

    return await page.evaluate(
      ({ carName, periodName, selectors }) => {
        const results = [];
        const carElements = document.querySelectorAll(selectors.title);
        const featureDivs = document.querySelectorAll(selectors.features);
        const priceDivs = document.querySelectorAll(selectors.price);

        carElements.forEach((carElement, index) => {
          const data = {};
          const carNameText = carElement.textContent.trim();
          data["Car Name"] = carNameText || "N/A";

          const ancestorContainer = carElement.closest("div");
          if (!ancestorContainer) return;

          const modelElement = ancestorContainer.querySelector(selectors.model);
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
            data["Cross Price"] = pElements[0]
              ? pElements[0].textContent.trim()
              : "N/A";
            data["Actual Price"] = pElements[1]
              ? pElements[1].textContent.trim()
              : "N/A";
          } else {
            data["Cross Price"] = "N/A";
            data["Actual Price"] = "N/A";
          }

          data["Original Vehicle"] = carName;
          data["Period"] = periodName;

          if (Object.keys(data).length > 0) {
            results.push(data);
          }
        });
        return results;
      },
      { carName, periodName, selectors }
    );
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

async function scrapeCars(carNames) {
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

  const sinceTime = Date.now();
  const periods = [
    { name: "Daily", duration: 9, durationDays: 1, isMonthly: false },
    { name: "Weekly", duration: 9, durationDays: 7, isMonthly: false },
    { name: "Monthly", duration: 1, durationDays: 30, isMonthly: true },
  ];

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

      // Check for CAPTCHA
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

      // Parallel scraping for periods
      const scrapePromises = periods.map(async (period) => {
        if (isScrapingCancelled) {
          return { success: false, message: "Scraping cancelled", data: [] };
        }
        const page = await context.newPage();
        try {
          const until = sinceTime + period.durationDays * 24 * 60 * 60 * 1000;
          const url = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceTime}&until=${until}&duration_months=${
            period.duration
          }&${
            period.isMonthly ? "is_monthly=true&" : ""
          }sort_by=price&sort_order=asc`;
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 50000,
          });
          await scrollPage(page);
          const result = await scrapeCarData(
            page,
            carName,
            period.name,
            selectors
          );
          return result.success !== false
            ? { success: true, data: result }
            : result;
        } catch (error) {
          return { success: false, message: error.message, data: [] };
        } finally {
          await page.close();
        }
      });

      const results = await Promise.all(scrapePromises);
      results.forEach((result) => {
        if (result.success) {
          scrapedData = scrapedData.concat(result.data);
        } else {
          errors.push(
            `Failed to scrape ${carName} (${
              periods[results.indexOf(result)].name
            }): ${result.message}`
          );
        }
      });
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

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("scrape", async (event, carNames) => {
  isScrapingCancelled = false;
  const result = await scrapeCars(carNames);
  return result;
});

ipcMain.handle("cancel-scrape", () => {
  isScrapingCancelled = true;
  return { success: true, message: "Scraping cancellation requested." };
});

ipcMain.handle("get-years", () => {
  const years = [
    ...new Set(
      scrapedData.map((item) => item.Year).filter((year) => year !== "N/A")
    ),
  ].sort();
  return years;
});

ipcMain.handle("get-car-names", () => {
  const carNames = [
    ...new Set(scrapedData.map((item) => item["Car Name"])),
  ].sort();
  return carNames;
});

ipcMain.handle("download-excel", async (event, { carNames, year, period }) => {
  let filteredData = scrapedData;
  if (carNames && carNames.length > 0 && carNames[0] !== "") {
    filteredData = filteredData.filter((item) =>
      carNames.includes(item["Car Name"])
    );
  }
  if (year) filteredData = filteredData.filter((item) => item.Year === year);
  if (period)
    filteredData = filteredData.filter((item) => item.Period === period);

  if (filteredData.length === 0) {
    return { success: false, message: "No data matches the selected filters" };
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
  if (period) fileNameParts.push(period.toLowerCase());
  const timestamp = Date.now();
  const fileName = `car_data_${fileNameParts.join("_")}_${timestamp}.xlsx`;
  const filePath = path.join(app.getPath("downloads"), fileName);
  xlsx.writeFile(workbook, filePath);

  await dialog.showMessageBox({
    type: "info",
    title: "Data Saved",
    message: `Your data is saved!\nFile: ${fileName}`,
    buttons: ["OK"],
  });

  return { success: true, message: `Excel file saved to ${filePath}` };
});
