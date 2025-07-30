// const express = require("express");
// const { chromium } = require("playwright");
// const xlsx = require("xlsx");
// const path = require("path");
// const fs = require("fs");
// const cors = require("cors");

// const app = express();
// // app.use(cors()); // Allow cross-origin requests
// app.use(
//   cors({
//     origin: "*", // Allow all origins
//     credentials: true, // Allow credentials (cookies, Authorization headers, etc.)
//   })
// );

// app.use(express.json()); // Parse JSON bodies
// app.use(express.static(path.join(__dirname, "public"))); // Serve frontend static files

// let scrapedData = [];
// let isScrapingCancelled = false;

// // Helper Functions (copied from main.js)
// function validateCarName(carName) {
//   const invalidChars = /[^a-zA-Z0-9\s-]/g;
//   if (!carName || carName.length < 2) {
//     return {
//       valid: false,
//       message: `Car name "${carName}" must be at least 2 characters long`,
//     };
//   }
//   if (invalidChars.test(carName)) {
//     return {
//       valid: false,
//       message: `Car name "${carName}" contains invalid characters. Use letters, numbers, spaces, or hyphens only.`,
//     };
//   }
//   return { valid: true };
// }

// function formatCarNameForUrl(carName) {
//   return carName.toLowerCase().replace(/\s+/g, "/");
// }

// function formatCarNameForFile(carName) {
//   return carName.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
// }

// async function scrollPage(page) {
//   let lastHeight = await page.evaluate(() => document.body.scrollHeight);
//   let attempts = 0;
//   const maxAttempts = 5;
//   while (attempts < maxAttempts) {
//     await page.evaluate(() => window.scrollBy(0, 1000));
//     await page.waitForTimeout(5000);
//     const newHeight = await page.evaluate(() => document.body.scrollHeight);
//     if (newHeight === lastHeight) {
//       attempts++;
//     } else {
//       attempts = 0;
//       lastHeight = newHeight;
//     }
//     if (isScrapingCancelled) throw new Error("Scraping cancelled by user");
//   }
// }

// async function scrapeCarData(
//   page,
//   carName,
//   periodName,
//   selectors,
//   durationHours,
//   isMonthly
// ) {
//   try {
//     await page.waitForSelector(selectors.title, { timeout: 3000 });
//     await page.waitForSelector(selectors.features, { timeout: 3000 });
//     await page.waitForSelector(selectors.price, { timeout: 3000 });

//     let results = [];
//     let retryCount = 0;
//     const maxRetries = 3;

//     while (retryCount < maxRetries) {
//       results = await page.evaluate(
//         ({ carName, periodName, selectors, durationHours, isMonthly }) => {
//           const results = [];
//           const carElements = document.querySelectorAll(selectors.title);
//           const featureDivs = document.querySelectorAll(selectors.features);
//           const priceDivs = document.querySelectorAll(selectors.price);

//           console.log(
//             `Found ${carElements.length} cars for ${carName} (${periodName})`
//           );

//     carElements.forEach((carElement, index) => {
//   const data = {};
//   const carNameText = carElement.textContent.trim();
//   data["Car Name"] = carNameText || "N/A";

//   const ancestorContainer = carElement.closest("div");
//   if (!ancestorContainer) return;

//   const modelElement = ancestorContainer.querySelector(
//     selectors.model
//   );
//   const modelText = modelElement
//     ? modelElement.textContent.trim()
//     : "N/A";
//   data["Model"] = modelText;
//   const yearMatch = modelText.match(/\d{4}/);
//   data["Year"] = yearMatch ? yearMatch[0] : "N/A";

//   const featureDiv = featureDivs[index];
//   if (featureDiv) {
//     const spanElements = featureDiv.querySelectorAll(
//       selectors.featureSpans
//     );
//     const featureTexts = Array.from(spanElements)
//       .map((span) => span.textContent.trim())
//       .filter((text) => text);
//     data["Description"] =
//       featureTexts.length > 0 ? featureTexts.join(", ") : "N/A";
//     data["Description"] =
//       data["Description"] === "N/A"
//         ? data["Description"]
//         : data["Description"].replace(/\s+/g, " ").trim();
//   } else {
//     data["Description"] = "N/A";
//   }

//   const priceDiv = priceDivs[index];
//   if (priceDiv) {
//     const pElements = priceDiv.querySelectorAll("p");
//     const spanElements = priceDiv.querySelectorAll("span");
//     data["Cross Price"] = pElements[0]
//       ? pElements[0].textContent.trim()
//       : "N/A";
//     data["Actual Price"] = pElements[1]
//       ? pElements[1].textContent.trim()
//       : "N/A";
//     if (durationHours > 24 && !isMonthly && spanElements[2]) {
//       data["Total"] = spanElements[2].textContent.trim() || "N/A";
//     } else {
//       data["Total"] = "N/A";
//     }
//   } else {
//     data["Cross Price"] = "N/A";
//     data["Actual Price"] = "N/A";
//     data["Total"] = "N/A";
//   }

//   data["Original Vehicle"] = carName;
//   data["Period"] = periodName;

//   if (Object.keys(data).length > 0) {
//     results.push(data);
//   }
// });
// return results;
//   },
//   { carName, periodName, selectors, durationHours, isMonthly }
// );

//       if (results.length > 0) break;
//       console.log(
//         `Retrying scrape for ${carName} (${periodName}), attempt ${
//           retryCount + 1
//         }`
//       );
//       await scrollPage(page);
//       retryCount++;
//     }

//     if (results.length === 0) {
//       console.log(
//         `No data scraped for ${carName} (${periodName}) after ${maxRetries} retries`
//       );
//       return {
//         success: false,
//         message: `No data found for ${carName} (${periodName})`,
//         data: [],
//       };
//     }

//     return { success: true, data: results };
//   } catch (error) {
//     let message = error.message;
//     if (error.message.includes("Timeout")) {
//       message = "First check on website for car name on Yango drive ";
//     } else if (error.message.includes("cancelled")) {
//       message = "Scraping was cancelled by the user.";
//     }
//     console.error(
//       `Error scraping data for ${carName} (${periodName}):`,
//       message
//     );
//     return { success: false, message, data: [] };
//   }
// }

// async function scrapeCars(carNames, sinceDateTime, untilDateTime, months) {
//   const errors = [];
//   for (const carName of carNames) {
//     const validation = validateCarName(carName);
//     if (!validation.valid) {
//       errors.push(validation.message);
//     }
//   }
//   if (errors.length > 0) {
//     return { success: false, message: errors.join("; ") };
//   }

//   let sinceTime,
//     untilTime,
//     durationHours,
//     isMonthly,
//     periodName,
//     durationMonths;
//   const now = new Date();

//   if (months && months > 0) {
//     isMonthly = true;
//     durationMonths = months;
//     sinceTime = now.getTime();
//     const untilDate = new Date(now);
//     untilDate.setMonth(now.getMonth() + months);
//     untilTime = untilDate.getTime();
//     durationHours = (untilTime - sinceTime) / (1000 * 60 * 60);
//     periodName = `${months} Month${months > 1 ? "s" : ""}`;
//   } else {
//     sinceTime = new Date(sinceDateTime).getTime();
//     untilTime = new Date(untilDateTime).getTime();
//     durationHours = (untilTime - sinceTime) / (1000 * 60 * 60);
//     isMonthly = durationHours >= 720;
//     durationMonths = isMonthly ? Math.ceil(durationHours / 720) : 0;
//     periodName = isMonthly
//       ? `${durationMonths} Month${durationMonths > 1 ? "s" : ""}`
//       : `${new Date(sinceTime).toLocaleString()} - ${new Date(
//           untilTime
//         ).toLocaleString()}`;
//   }

//   if (sinceTime < now.getTime()) {
//     return {
//       success: false,
//       message: "Since date and time cannot be in the past",
//     };
//   }

//   const browser = await chromium.launch({ headless: true });
//   const context = await browser.newContext();
//   await context.setExtraHTTPHeaders({
//     "User-Agent":
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
//     "Accept-Language": "en-US,en;q=0.9",
//     Accept:
//       "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
//   });

// const selectors = {
//   title: 'span[class*="Card_CardTitleMedium__korrS"]',
//   features:
//     'div[class*="HStack_HStack__bHoaj Card_CardBubbles__zuOuw HStack_gap__ml__UeOp6"]',
//   price:
//     'div[class*="Heading_Heading__PjLg8 Card_CardPrice__spWUR Heading_left__Xd02k"]',
//   model: 'span[class*="ButtonSimilarInfo_ButtonSimilarInfoPrefix___Qou3"]',
//   featureSpans:
//     'span[class*="Text_Text__F4Wpv Card_CardBubble__zukT3 Text_color_Gray__1IX1U"]',
// };

//   scrapedData = [];
//   let captchaDetected = false;

//   try {
//     for (const carName of carNames) {
//       if (isScrapingCancelled) {
//         return { success: false, message: "Scraping cancelled" };
//       }

//       const formattedCarName = formatCarNameForUrl(carName.toLowerCase());

//       const captchaPage = await context.newPage();
//       await captchaPage.goto(
//         `https://drive.yango.com/search/all/${formattedCarName}`,
//         {
//           waitUntil: "domcontentloaded",
//           timeout: 50000,
//         }
//       );
//       const captcha = await captchaPage.evaluate(
//         () =>
//           !!document.querySelector(
//             'iframe[src*="captcha"], div[id*="captcha"], [class*="captcha"]'
//           )
//       );
//       if (captcha) {
//         captchaDetected = true;
//         await captchaPage.close();
//         throw new Error(
//           `CAPTCHA detected for ${carName}. Manual intervention required.`
//         );
//       }
//       await captchaPage.close();

//       const page = await context.newPage();
//       try {
//         const url = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceTime}&until=${untilTime}&duration_months=${
//           isMonthly ? durationMonths : 0
//         }${isMonthly ? "&is_monthly=true" : ""}&sort_by=price&sort_order=asc`;
//         console.log(`Navigating to URL: ${url}`);
//         await page.goto(url, { waitUntil: "domcontentloaded", timeout: 50000 });
//         await scrollPage(page);
//         const result = await scrapeCarData(
//           page,
//           carName,
//           periodName,
//           selectors,
//           durationHours,
//           isMonthly
//         );
//         if (result.success) {
//           console.log(
//             `Scraped ${result.data.length} items for ${carName} (${periodName})`
//           );
//           scrapedData = scrapedData.concat(result.data);
//         } else {
//           errors.push(
//             `Failed to scrape ${carName} (${periodName}): ${result.message}`
//           );
//         }
//       } catch (error) {
//         errors.push(
//           `Failed to scrape ${carName} (${periodName}): ${error.message}`
//         );
//       } finally {
//         await page.close();
//       }
//     }

//     if (captchaDetected) {
//       return {
//         success: false,
//         message:
//           "CAPTCHA detected on the website. Manual intervention required.",
//       };
//     }

//     if (scrapedData.length === 0) {
//       return {
//         success: false,
//         message:
//           errors.length > 0
//             ? errors.join("; ")
//             : "No data scraped. Check car names or website availability.",
//       };
//     }

//     return {
//       success: true,
//       message:
//         errors.length > 0
//           ? `Scraping completed with errors: ${errors.join("; ")}`
//           : "Scraping completed successfully.",
//       data: scrapedData,
//     };
//   } catch (error) {
//     return { success: false, message: error.message };
//   } finally {
//     await context.close();
//     await browser.close();
//   }
// }

// // API Endpoints
// app.post("/api/scrape", async (req, res) => {
//   const { carNames, sinceDateTime, untilDateTime, months } = req.body;
//   isScrapingCancelled = false;
//   const result = await scrapeCars(
//     carNames,
//     sinceDateTime,
//     untilDateTime,
//     months
//   );
//   res.json(result);
// });

// app.post("/api/cancel-scrape", (req, res) => {
//   isScrapingCancelled = true;
//   res.json({ success: true, message: "Scraping cancellation requested." });
// });

// app.get("/api/years", (req, res) => {
//   const years = [
//     ...new Set(
//       scrapedData.map((item) => item.Year).filter((year) => year !== "N/A")
//     ),
//   ].sort();
//   res.json(years);
// });

// app.get("/api/car-names", (req, res) => {
//   const carNames = [
//     ...new Set(scrapedData.map((item) => item["Car Name"])),
//   ].sort();
//   res.json(carNames);
// });

// app.post("/api/download-excel", async (req, res) => {
//   let { carNames, year } = req.body;
//   let filteredData = scrapedData;
//   if (carNames && carNames.length > 0 && carNames[0] !== "") {
//     filteredData = filteredData.filter((item) =>
//       carNames.includes(item["Car Name"])
//     );
//   }
//   if (year) filteredData = filteredData.filter((item) => item.Year === year);

//   if (filteredData.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "No data matches the selected filters",
//     });
//   }

//   const worksheet = xlsx.utils.json_to_sheet(filteredData);
//   const workbook = xlsx.utils.book_new();
//   xlsx.utils.book_append_sheet(workbook, worksheet, "Car Data");

//   let fileNameParts = [];
//   if (carNames && carNames.length > 0 && carNames[0] !== "") {
//     fileNameParts.push(carNames.map(formatCarNameForFile).join("_"));
//   } else {
//     fileNameParts.push("all_cars");
//   }
//   if (year) fileNameParts.push(year);
//   const timestamp = Date.now();
//   const fileName = `car_data_${fileNameParts.join("_")}_${timestamp}.xlsx`;

//   // Ensure temp directory exists
//   const tempDir = path.join(__dirname, "temp");
//   if (!fs.existsSync(tempDir)) {
//     fs.mkdirSync(tempDir);
//   }

//   const filePath = path.join(tempDir, fileName);
//   xlsx.writeFile(workbook, filePath);

//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Error sending file:", err);
//       res
//         .status(500)
//         .json({ success: false, message: "Failed to download file" });
//     }
//     // Clean up the file
//     fs.unlink(filePath, (err) => {
//       if (err) console.error("Error deleting temp file:", err);
//     });
//   });
// });

// // Start the server
// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

//............................this is new one code which is working currectly
const express = require("express");
const { chromium } = require("playwright");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html at root URL
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(indexPath)) {
    console.log(`Serving index.html from ${indexPath}`);
    res.sendFile(indexPath);
  } else {
    console.error(`index.html not found at ${indexPath}`);
    res.status(404).send("index.html not found");
  }
});

let scrapedData = [];
let isScrapingCancelled = false;
let cookieStore = [];

function validateCarName(carName) {
  const invalidChars = /[^a-zA-Z0-9\s-]/g;
  if (!carName || carName.length < 3) {
    return {
      valid: false,
      message: `Car name "${carName}" must be at least 3 characters long`,
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

function sanitizeFileName(str) {
  return str
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

async function scrapeCarData(
  page,
  carName,
  periodName,
  selectors,
  durationHours,
  isMonthly,
  mainUrl
) {
  try {
    let index = 0;
    let results = [];
    const maxRetries = 1;

    while (true) {
      if (isScrapingCancelled) throw new Error("Scraping cancelled by user");

      // Load main page
      console.log(
        `Loading main page for car ${index + 1} in ${carName} (${periodName})`
      );
      await page.goto(mainUrl, {
        waitUntil: "domcontentloaded",
        timeout: 5000,
      });
      // await page.evaluate(() => {
      //   return new Promise((resolve) => {
      //     let scrollPosition = 0;
      //     const scrollStep = 200; // Pixels to scroll per step
      //     const scrollInterval = 100; // Interval in milliseconds
      //     const totalDuration = 5000; // 5 seconds
      //     const steps = totalDuration / scrollInterval;

      //     const scrollDown = () => {
      //       scrollPosition += scrollStep;
      //       window.scrollTo(0, scrollPosition);
      //       if (scrollPosition < document.body.scrollHeight) {
      //         setTimeout(scrollDown, scrollInterval);
      //       } else {
      //         // Scroll back to top after reaching the bottom
      //         setTimeout(() => {
      //           window.scrollTo(0, 0);
      //           resolve();
      //         }, scrollInterval);
      //       }
      //     };

      //     scrollDown();
      //   });
      // });

      // Wait for car cards
      try {
        await page.waitForSelector(selectors.title, {
          state: "visible",
          timeout: 5000,
        });
        await page.waitForSelector(selectors.features, {
          state: "visible",
          timeout: 5000,
        });
        await page.waitForSelector(selectors.price, {
          state: "visible",
          timeout: 5000,
        });
        console.log(`Car cards loaded for ${carName} (${periodName})`);
      } catch (error) {
        console.warn(
          `No car cards found for ${carName} (${periodName}): ${error.message}`
        );
        // await page.screenshot({
        //   path: `error-no-cards-${formatCarNameForFile(carName)}-${sanitizeFileName(periodName)}-${Date.now()}.png`,
        //   fullPage: true
        // });
        break;
      }

      // Scrape card at index
      let retryCount = 0;
      let cardData = null;
      while (retryCount < maxRetries) {
        try {
          cardData = await page.evaluate(
            ({
              index,
              carName,
              periodName,
              selectors,
              durationHours,
              isMonthly,
            }) => {
              const carElements = document.querySelectorAll(selectors.title);
              const featureDivs = document.querySelectorAll(selectors.features);
              const priceDivs = document.querySelectorAll(selectors.price);
              const buttonElements = document.querySelectorAll(
                selectors.button
              );

              console.log(
                `Found ${buttonElements.length} buttons with selector ${selectors.button}`
              );

              // if (index >= carElements.length) return null;
              if (index >= 5) return null;

              const data = {};
              const carElement = carElements[index];
              data["Car Name"] = carElement.textContent.trim() || "N/A";

              const ancestorContainer = carElement.closest("div");
              if (!ancestorContainer) return null;

              const modelElement = ancestorContainer.querySelector(
                selectors.model
              );
              data["Model"] = modelElement
                ? modelElement.textContent.trim()
                : "N/A";
              const yearMatch = data["Model"].match(/\d{4}/);
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
                data["Description"] = data["Description"]
                  .replace(/\s+/g, " ")
                  .trim();
              } else {
                data["Description"] = "N/A";
              }

              // const priceDiv = priceDivs[index];
              // if (priceDiv) {
              //   const pElements = priceDiv.querySelectorAll("p");
              //   const spanElements = priceDiv.querySelectorAll("span");
              //   data["Cross Price"] = pElements[0]
              //     ? pElements[0].textContent.trim()
              //     : "N/A";
              //   data["Actual Price"] = pElements[1]
              //     ? pElements[1].textContent.trim()
              //     : "N/A";
              //   data["Total"] =
              //     durationHours > 24 && !isMonthly && spanElements[2]
              //       ? spanElements[2].textContent.trim()
              //       : "N/A";
              // } else {
              //   data["Cross Price"] = "N/A";
              //   data["Actual Price"] = "N/A";
              //   data["Total"] = "N/A";
              // }
              const priceDiv = priceDivs[index];
              if (priceDiv) {
                const pElements = priceDiv.querySelectorAll("p");
                let crossPrice = "N/A";
                let actualPrice = "N/A";
                let totalPrice = "N/A";

                pElements.forEach((p) => {
                  const text = p.textContent.trim();

                  if (/Total:/i.test(text)) {
                    totalPrice = text.replace("Total:", "").trim();
                  } else if (
                    /AED/.test(text) &&
                    p.querySelector(".Price_crossOut__QufS3")
                  ) {
                    crossPrice = text;
                  } else if (/AED/.test(text)) {
                    actualPrice = text;
                  }
                });

                data["Cross Price"] = crossPrice;
                data["Actual Price"] = actualPrice;
                data["Total"] = totalPrice;
              } else {
                data["Cross Price"] = "N/A";
                data["Actual Price"] = "N/A";
                data["Total"] = "N/A";
              }

              data["Original Vehicle"] = carName;
              data["Period"] = periodName;

              return { data, hasButton: !!buttonElements[index] };
            },
            { index, carName, periodName, selectors, durationHours, isMonthly }
          );

          if (cardData) break;
          console.log(
            `Retrying card ${
              index + 1
            } for ${carName} (${periodName}), attempt ${retryCount + 1}`
          );
          await page.waitForTimeout(2000);
          retryCount++;
        } catch (error) {
          console.error(`Error evaluating card ${index + 1}: ${error.message}`);
          retryCount++;
        }
      }

      if (!cardData) {
        console.log(
          `No more cards found for ${carName} (${periodName}) at index ${index}`
        );
        break;
      }

      results.push(cardData.data);

      // Click View Deal if button exists
      if (cardData.hasButton) {
        const buttonSelector = selectors.button;
        try {
          const button = await page.locator(buttonSelector).nth(index).first();
          await button.scrollIntoViewIfNeeded();
          await button.waitFor({ state: "visible", timeout: 2000 });
          console.log(
            `Clicking View Deal for car ${
              index + 1
            } in ${carName} (${periodName})`
          );
          await button.click({ timeout: 3000 });
          await page.waitForTimeout(2000); // Wait 3 seconds for second page to load

          // Wait for second-page content
          await page
            .waitForSelector('div[class*="Island_IslandWrap__QuZPl"]', {
              state: "visible",
              timeout: 3000,
            })
            .catch(() => {
              console.warn(`Mileage section not found for car ${index + 1}`);
            });

          // await page.screenshot({
          //   path: `screenshot-second-page-${formatCarNameForFile(carName)}-${sanitizeFileName(periodName)}-${index + 1}-${Date.now()}.png`,
          //   fullPage: true
          // });

          // Scrape Mileage
          // const mileage = await page.evaluate(() => {
          //   const mileageSection = Array.from(
          //     document.querySelectorAll(
          //       'div[class*="Island_IslandWrap__QuZPl"]'
          //     )
          //   ).find((section) =>
          //     section
          //       .querySelector("h3")
          //       ?.textContent.toLowerCase()
          //       .includes("mileage")
          //   );
          //   if (!mileageSection) return "N/A";
          //   const titles = Array.from(
          //     mileageSection.querySelectorAll(
          //       'div[class*="SlotText_Title__gHEmU"]'
          //     )
          //   ).map((el) => el.textContent.trim());
          //   const subtitles = Array.from(
          //     mileageSection.querySelectorAll(
          //       'div[class*="SlotText_Subtitle__yHTPE"]'
          //     )
          //   ).map((el) => el.textContent.trim());
          //   return (
          //     [...titles, ...subtitles].filter((text) => text).join("; ") ||
          //     "N/A"
          //   );
          // });
          const mileage = await page.evaluate(() => {
            const mileageSection = Array.from(
              document.querySelectorAll(
                'div[class*="Island_IslandWrap__QuZPl"]'
              )
            ).find((section) =>
              section
                .querySelector("h3")
                ?.textContent.toLowerCase()
                .includes("mileage")
            );

            if (!mileageSection) return "N/A";

            // Get combined raw text from title and subtitle blocks
            const titles = Array.from(
              mileageSection.querySelectorAll(
                'div[class*="SlotText_Title__gHEmU"]'
              )
            ).map((el) => el.textContent.trim());

            const subtitles = Array.from(
              mileageSection.querySelectorAll(
                'div[class*="SlotText_Subtitle__yHTPE"]'
              )
            ).map((el) => el.textContent.trim());

            const combined = [...titles, ...subtitles].join(" ");

            // Extract numbers
            const kmMatch = combined.match(/([\d,]+)\s*km/i);
            const priceMatch = combined.match(/AED\s?(\d+(\.\d+)?)/i);

            const km = kmMatch ? kmMatch[1].replace(/,/g, "") : null;
            const price = priceMatch ? priceMatch[1] : null;

            if (km && price) {
              return `${km} km, then ${price} AED per km`;
            }

            return "N/A";
          });

          // Scrape Insurance & Options line by line
          // const insuranceOptions = await page.evaluate(() => {
          //   const insuranceSection = document.querySelector(
          //     'div[class*="BookFormInsuranceOptions_island__QC71c"]'
          //   );
          //   if (!insuranceSection) return "N/A";
          //   const textNodes = Array.from(insuranceSection.querySelectorAll("*"))
          //     .filter(
          //       (el) =>
          //         el.childNodes.length &&
          //         Array.from(el.childNodes).some(
          //           (node) => node.nodeType === Node.TEXT_NODE
          //         )
          //     )
          //     .map((el) => {
          //       const text = Array.from(el.childNodes)
          //         .filter((node) => node.nodeType === Node.TEXT_NODE)
          //         .map((node) => node.textContent.trim())
          //         .filter((text) => text)
          //         .join(" ");
          //       return text;
          //     })
          //     .filter((text) => text);
          //   return textNodes.length > 0 ? textNodes.join("\n") : "N/A";
          // });
          const insuranceOptions = await page.evaluate(() => {
            const insuranceSection = document.querySelector(
              'div[class*="BookFormInsuranceOptions_island__"]'
            );
            if (!insuranceSection) return "N/A";

            // Extract all visible text content
            const rawText = insuranceSection.innerText || "";
            const lines = rawText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);

            const result = [];

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];

              // 1. Comprehensive Insurance
              if (line.includes("Comprehensive Insurance")) {
                result.push(line);
              }

              // 2. Excess amount (e.g., 1000 - 5000 AED)
              if (/excess amount.*\d+.*AED/i.test(line)) {
                result.push(line);
              }

              // 3. Deposit-free ride for AED
              if (/deposit[- ]free ride.*AED/i.test(line)) {
                result.push(line);
              }

              // 4. Deposit amount (e.g., "Deposit" followed by a line with "AED 1500")
              if (
                line.toLowerCase() === "deposit" &&
                lines[i + 1]?.includes("AED")
              ) {
                result.push(` or ${line} ${lines[i + 1]}`);
              }
            }

            return result.length ? result.join("\n") : "N/A";
          });

          console.log(
            `Scraped second page for car ${
              index + 1
            }: Mileage="${mileage}", Insurance="${insuranceOptions}"`
          );

          results[index]["Mileage"] = mileage;
          results[index]["Insurance & Options"] = insuranceOptions;

          cookieStore = await page.context().cookies();
        } catch (error) {
          console.error(
            `Error on second page for car ${index + 1}: ${error.message}`
          );
          // await page.screenshot({
          //   path: `error-second-page-${formatCarNameForFile(carName)}-${sanitizeFileName(periodName)}-${index + 1}-${Date.now()}.png`,
          //   fullPage: true
          // });
          results[index]["Mileage"] = "N/A";
          results[index]["Insurance & Options"] = "N/A";
        }
      } else {
        console.log(`No View Deal button found for car ${index + 1}`);
        // await page.screenshot({
        //   path: `error-no-button-${formatCarNameForFile(carName)}-${sanitizeFileName(periodName)}-${index + 1}-${Date.now()}.png`,
        //   fullPage: true
        // });
        results[index]["Mileage"] = "N/A";
        results[index]["Insurance & Options"] = "N/A";
      }

      index++;
    }

    if (results.length === 0) {
      console.log(`No data scraped for ${carName} (${periodName})`);
      return {
        success: false,
        message: `No data found for ${carName} (${periodName})`,
        data: [],
      };
    }

    return { success: true, data: results };
  } catch (error) {
    let message = error.message.includes("timeout")
      ? "Check car name on Yango Drive website"
      : error.message.includes("cancelled")
      ? "Scraping cancelled by user"
      : error.message;
    // console.error(`Error scraping ${carName} (${periodName}): ${message}`);
    // await page.screenshot({
    //   path: `error-scrape-${formatCarNameForFile(carName)}-${sanitizeFileName(periodName)}-${Date.now()}.png`,
    //   fullPage: true
    // });
    return { success: false, message, data: [] };
  }
}

async function scrapeCars(
  carNames,
  dailyCheck,
  weeklyCheck,
  monthlyCheck,
  pickupDate,
  dropOffDate,
  monthlyData
) {
  const errors = [];
  for (const carName of carNames) {
    const validation = validateCarName(carName);
    if (!validation.valid) errors.push(validation.message);
  }
  if (errors.length > 0) return { success: false, message: errors.join("; ") };

  const browser = await chromium.launch({ headless: true});
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
    features: 'div[class*="HStack_HStack__bHoaj Card_CardBubbles__zuOuw"]',
    price: 'div[class*="Heading_Heading__PjLg8 Card_CardPrice__spWUR"]',
    model: 'span[class*="ButtonSimilarInfo_ButtonSimilarInfoPrefix___Qou3"]',
    featureSpans: 'span[class*="Text_Text__F4Wpv Card_CardBubble__zukT3"]',
    button: 'button[data-testid="Card.Book"]',
  };

  // Calculate base time (current time + 2 hours)
  const now = new Date(); // Current time: 03:41 PM IST
  now.setHours(now.getHours() + 7); // Add 2 hours to get 05:41 PM IST
  const baseTime = now.toTimeString().split(" ")[0]; // "17:41:00"
  console.log("base time is ", baseTime);

  try {
    for (const carName of carNames) {
      if (isScrapingCancelled)
        return { success: false, message: "Scraping cancelled" };
      const formattedCarName = formatCarNameForUrl(carName.toLowerCase());

      // const captchaPage = await context.newPage();
      // try {
      //   console.log(`Checking initial page for ${carName}`);
      //   await captchaPage.goto(
      //     `https://drive.yango.com/search/all/${formattedCarName}`,
      //     {
      //       waitUntil: "domcontentloaded",
      //       timeout: 5000,
      //     }
      //   );
      //   cookieStore = await captchaPage.context().cookies();
      // } catch (error) {
      //   errors.push(
      //     `Initial page load failed for ${carName}: ${error.message}`
      //   );
      //   await captchaPage.close();
      //   continue;
      // } finally {
      //   await captchaPage.close();
      // }

      const page = await context.newPage();
      try {
        if (cookieStore.length > 0) await context.addCookies(cookieStore);

        // Daily rental
        if (dailyCheck) {
          const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
          const untilDateTime = new Date(
            `${dropOffDate}T${baseTime}`
          ).getTime();
          const durationHours =
            (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
          const periodName = `${new Date(
            sinceDateTime
          ).toLocaleString()} - ${new Date(untilDateTime).toLocaleString()}`;
          const isMonthly = durationHours >= 720;
          const durationMonths = isMonthly ? Math.ceil(durationHours / 720) : 0;
          const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${durationMonths}${
            isMonthly ? "&is_monthly=true" : ""
          }&sort_by=price&sort_order=asc`;
          const result = await scrapeCarData(
            page,
            carName,
            periodName,
            selectors,
            durationHours,
            isMonthly,
            mainUrl
          );
          if (result.success) scrapedData = scrapedData.concat(result.data);
          else
            errors.push(
              `Daily scrape failed for ${carName}: ${result.message}`
            );
        }

        // Weekly rental
        if (weeklyCheck) {
          const sinceDate = new Date(pickupDate);
          const untilDate = new Date(dropOffDate);
          const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
          untilDate.setDate(sinceDate.getDate() + 7); // Add 7 days
          const untilDateTime = new Date(
            `${untilDate.toISOString().split("T")[0]}T${baseTime}`
          ).getTime();
          const durationHours =
            (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
          const periodName = `${new Date(
            sinceDateTime
          ).toLocaleString()} - ${new Date(untilDateTime).toLocaleString()}`;
          const isMonthly = durationHours >= 720;
          const durationMonths = isMonthly ? Math.ceil(durationHours / 720) : 0;
          const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${durationMonths}${
            isMonthly ? "&is_monthly=true" : ""
          }&sort_by=price&sort_order=asc`;
          const result = await scrapeCarData(
            page,
            carName,
            periodName,
            selectors,
            durationHours,
            isMonthly,
            mainUrl
          );
          if (result.success) scrapedData = scrapedData.concat(result.data);
          else
            errors.push(
              `Weekly scrape failed for ${carName}: ${result.message}`
            );
        }

        // Monthly rental
        if (monthlyCheck && monthlyData.months) {
          const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
          const untilDate = new Date(dropOffDate);
          untilDate.setMonth(untilDate.getMonth() + monthlyData.months);
          const untilDateTime = new Date(
            `${untilDate.toISOString().split("T")[0]}T${baseTime}`
          ).getTime();
          const durationHours =
            (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
          const periodName = `${monthlyData.months} Month${
            monthlyData.months > 1 ? "s" : ""
          } from ${new Date(sinceDateTime).toLocaleString()}`;
          const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${monthlyData.months}&is_monthly=true&sort_by=price&sort_order=asc`;
          const result = await scrapeCarData(
            page,
            carName,
            periodName,
            selectors,
            durationHours,
            true,
            mainUrl
          );
          if (result.success) scrapedData = scrapedData.concat(result.data);
          else
            errors.push(
              `Monthly scrape failed for ${carName}: ${result.message}`
            );
        }
      } catch (error) {
        errors.push(`Failed to scrape ${carName}: ${error.message}`);
      } finally {
        await page.close();
      }
    }

    if (scrapedData.length === 0) {
      return {
        success: false,
        message: errors.length > 0 ? errors.join("; ") : "No data scraped",
      };
    }

    return {
      success: true,
      message:
        errors.length > 0
          ? `Scraping completed with errors: ${errors.join("; ")}`
          : "Scraping completed successfully",
      data: scrapedData,
    };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    await context.close();
    await browser.close();
  }
}

app.post("/api/scrape", async (req, res) => {
  const {
    carNames,
    dailyCheck,
    weeklyCheck,
    monthlyCheck,
    pickupDate,
    dropOffDate,
    monthlyData,
  } = req.body;
  isScrapingCancelled = false;
  scrapedData = [];
  const result = await scrapeCars(
    carNames,
    dailyCheck,
    weeklyCheck,
    monthlyCheck,
    pickupDate,
    dropOffDate,
    monthlyData || {}
  );
  res.json(result);
});

app.post("/api/cancel-scrape", (req, res) => {
  isScrapingCancelled = true;
  res.json({ success: true, message: "Scraping cancellation requested" });
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
    return res.status(400).json({
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

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const filePath = path.join(tempDir, fileName);
  xlsx.writeFile(workbook, filePath);

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to download file" });
    }
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// const express = require("express");
// const { chromium } = require("playwright");
// const xlsx = require("xlsx");
// const path = require("path");
// const fs = require("fs");
// const cors = require("cors");

// const app = express();
// app.use(
//   cors({
//     origin: "*",
//     credentials: true,
//   })
// );

// app.use(express.json());
// app.use(express.static(path.join(__dirname, "public")));

// let scrapedData = [];
// let isScrapingCancelled = false;

// function validateCarName(carName) {
//   const invalidChars = /[^a-zA-Z0-9\s-]/g;
//   if (!carName || carName.length < 2) {
//     return {
//       valid: false,
//       message: `Car name "${carName}" must be at least 2 characters long`,
//     };
//   }
//   if (invalidChars.test(carName)) {
//     return {
//       valid: false,
//       message: `Car name "${carName}" contains invalid characters. Use letters, numbers, spaces, or hyphens only.`,
//     };
//   }
//   return { valid: true };
// }

// function formatCarNameForUrl(carName) {
//   return carName.toLowerCase().replace(/\s+/g, "/");
// }

// function formatCarNameForFile(carName) {
//   return carName.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
// }

// // async function scrollPage(page) {
// //   let lastHeight = await page.evaluate(() => document.body.scrollHeight);
// //   let attempts = 0;
// //   const maxAttempts = 5;
// //   while (attempts < maxAttempts) {
// //     await page.evaluate(() => window.scrollBy(0, 1000));
// //     await page.waitForTimeout(5000);
// //     const newHeight = await page.evaluate(() => document.body.scrollHeight);
// //     if (newHeight === lastHeight) {
// //       attempts++;
// //     } else {
// //       attempts = 0;
// //       lastHeight = newHeight;
// //     }
// //     if (isScrapingCancelled) throw new Error("Scraping cancelled by user");
// //   }
// // }
// async function scrollPage(page) {
//   let lastHeight = await page.evaluate(() => document.body.scrollHeight);
//   let attempts = 0;
//   const maxAttempts = 5;

//   while (attempts < maxAttempts) {
//     // Check if "You may also like" section is visible
//     const isVisible = await page.evaluate(() => {
//       const target = document.querySelector(
//         ".Heading_Heading__PjLg8.SimilarOffers_SimilarOffersHeading__NWX_k"
//       );
//       return target && target.innerText.includes("You may also like");
//     });

//     if (isVisible) {
//       console.log('"You may also like" section found. Stopping scroll.');
//       break;
//     }

//     // Scroll down
//     await page.evaluate(() => window.scrollBy(0, 1000));
//     await page.waitForTimeout(5000);

//     // Check if scroll height changed
//     const newHeight = await page.evaluate(() => document.body.scrollHeight);
//     if (newHeight === lastHeight) {
//       attempts++;
//     } else {
//       attempts = 0;
//       lastHeight = newHeight;
//     }

//     if (typeof isScrapingCancelled !== "undefined" && isScrapingCancelled) {
//       throw new Error("Scraping cancelled by user");
//     }
//   }
// }

// async function scrapeCarData(
//   page,
//   carName,
//   periodName,
//   selectors,
//   durationHours,
//   isMonthly
// ) {
//   try {
//     await page.waitForSelector(selectors.title, { timeout: 3000 });
//     await page.waitForSelector(selectors.features, { timeout: 3000 });
//     await page.waitForSelector(selectors.price, { timeout: 3000 });

//     let results = [];
//     let retryCount = 0;
//     const maxRetries = 1;

//     while (retryCount < maxRetries) {
//       results = await page.evaluate(
//         ({ carName, periodName, selectors, durationHours, isMonthly }) => {
//           const results = [];
//           const carElements = document.querySelectorAll(selectors.title);
//           const featureDivs = document.querySelectorAll(selectors.features);
//           const priceDivs = document.querySelectorAll(selectors.price);

//           console.log(
//             `Found ${carElements.length} cars for ${carName} (${periodName})`
//           );

//           carElements.forEach((carElement, index) => {
//             const data = {};
//             const carNameText = carElement.textContent.trim();
//             data["Car Name"] = carNameText || "N/A";

//             const ancestorContainer = carElement.closest("div");
//             if (!ancestorContainer) return;

//             const modelElement = ancestorContainer.querySelector(
//               selectors.model
//             );
//             const modelText = modelElement
//               ? modelElement.textContent.trim()
//               : "N/A";
//             data["Model"] = modelText;
//             const yearMatch = modelText.match(/\d{4}/);
//             data["Year"] = yearMatch ? yearMatch[0] : "N/A";

//             const featureDiv = featureDivs[index];
//             if (featureDiv) {
//               const spanElements = featureDiv.querySelectorAll(
//                 selectors.featureSpans
//               );
//               const featureTexts = Array.from(spanElements)
//                 .map((span) => span.textContent.trim())
//                 .filter((text) => text);
//               data["Description"] =
//                 featureTexts.length > 0 ? featureTexts.join(", ") : "N/A";
//               data["Description"] =
//                 data["Description"] === "N/A"
//                   ? data["Description"]
//                   : data["Description"].replace(/\s+/g, " ").trim();
//             } else {
//               data["Description"] = "N/A";
//             }

//             const priceDiv = priceDivs[index];
//             if (priceDiv) {
//               const pElements = priceDiv.querySelectorAll("p");
//               const spanElements = priceDiv.querySelectorAll("span");
//               data["Cross Price"] = pElements[0]
//                 ? pElements[0].textContent.trim()
//                 : "N/A";
//               data["Actual Price"] = pElements[1]
//                 ? pElements[1].textContent.trim()
//                 : "N/A";
//               if (durationHours > 24 && !isMonthly && spanElements[2]) {
//                 data["Total"] = spanElements[2].textContent.trim() || "N/A";
//               } else {
//                 data["Total"] = "N/A";
//               }
//             } else {
//               data["Cross Price"] = "N/A";
//               data["Actual Price"] = "N/A";
//               data["Total"] = "N/A";
//             }

//             data["Original Vehicle"] = carName;
//             data["Period"] = periodName;

//             if (Object.keys(data).length > 0) {
//               results.push(data);
//             }
//           });
//           return results;
//         },
//         { carName, periodName, selectors, durationHours, isMonthly }
//       );

//       if (results.length > 0) break;
//       console.log(
//         `Retrying scrape for ${carName} (${periodName}), attempt ${
//           retryCount + 1
//         }`
//       );
//       await scrollPage(page);
//       retryCount++;
//     }

//     if (results.length === 0) {
//       console.log(
//         `No data scraped for ${carName} (${periodName}) after ${maxRetries} retries`
//       );
//       return {
//         success: false,
//         message: `No data found for ${carName} (${periodName})`,
//         data: [],
//       };
//     }

//     return { success: true, data: results };
//   } catch (error) {
//     let message = error.message;
//     if (error.message.includes("Timeout")) {
//       message = "First check on website for car name on Yango drive ";
//     } else if (error.message.includes("cancelled")) {
//       message = "Scraping was cancelled by the user.";
//     }
//     console.error(
//       `Error scraping data for ${carName} (${periodName}):`,
//       message
//     );
//     return { success: false, message, data: [] };
//   }
// }

// async function scrapeCars(
//   carNames,
//   dailyCheck,
//   weeklyCheck,
//   monthlyCheck,
//   pickupDate,
//   dropOffDate,
//   monthlyData
// ) {
//   const errors = [];
//   for (const carName of carNames) {
//     const validation = validateCarName(carName);
//     if (!validation.valid) {
//       errors.push(validation.message);
//     }
//   }
//   if (errors.length > 0) {
//     return { success: false, message: errors.join("; ") };
//   }

//   const now = new Date();
//   now.setHours(now.getHours() + 2);
//   const baseTime = now.toTimeString().split(" ")[0]; // "15:03:00"

//   const browser = await chromium.launch({ headless: false });
//   const context = await browser.newContext();
//   await context.setExtraHTTPHeaders({
//     "User-Agent":
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
//     "Accept-Language": "en-US,en;q=0.9",
//     Accept:
//       "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
//   });

//   const selectors = {
//     title: 'span[class*="Card_CardTitleMedium__korrS"]',
//     features:
//       'div[class*="HStack_HStack__bHoaj Card_CardBubbles__zuOuw HStack_gap__ml__UeOp6"]',
//     price:
//       'div[class*="Heading_Heading__PjLg8 Card_CardPrice__spWUR Heading_left__Xd02k"]',
//     model: 'span[class*="ButtonSimilarInfo_ButtonSimilarInfoPrefix___Qou3"]',
//     featureSpans:
//       'span[class*="Text_Text__F4Wpv Card_CardBubble__zukT3 Text_color_Gray__1IX1U"]',
//   };

//   scrapedData = [];
//   // let captchaDetected = false;

//   try {
//     for (const carName of carNames) {
//       // if (isScrapingCancelled) {
//       //   return { success: false, message: "Scraping cancelled" };
//       // }

//       const formattedCarName = formatCarNameForUrl(carName.toLowerCase());

//       // const captchaPage = await context.newPage();
//       // await captchaPage.goto(
//       //   `https://drive.yango.com/search/all/${formattedCarName}`,
//       //   {
//       //     waitUntil: "domcontentloaded",
//       //     timeout: 50000,
//       //   }
//       // );
//       // const captcha = await captchaPage.evaluate(
//       //   () =>
//       //     !!document.querySelector(
//       //       'iframe[src*="captcha"], div[id*="captcha"], [class*="captcha"]'
//       //     )
//       // );
//       // if (captcha) {
//       //   captchaDetected = true;
//       //   await captchaPage.close();
//       //   throw new Error(
//       //     `CAPTCHA detected for ${carName}. Manual intervention required.`
//       //   );
//       // }
//       // await captchaPage.close();

//       const page = await context.newPage();
//       try {
//         if (dailyCheck) {
//           const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
//           const untilDateTime = new Date(
//             `${dropOffDate}T${baseTime}`
//           ).getTime();
//           const durationHours =
//             (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
//           const periodName = `${new Date(
//             sinceDateTime
//           ).toLocaleString()} - ${new Date(untilDateTime).toLocaleString()}`;
//           const isMonthly = durationHours >= 720;
//           const durationMonths = isMonthly ? Math.ceil(durationHours / 720) : 0;
//           const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${durationMonths}${
//             isMonthly ? "&is_monthly=true" : ""
//           }&sort_by=price&sort_order=asc`;
//           console.log(`Navigating to URL: ${mainUrl}`);
//           await page.goto(mainUrl, {
//             waitUntil: "domcontentloaded",
//             timeout: 50000,
//           });

//           await scrollPage(page);
//           const result = await scrapeCarData(
//             page,
//             carName,
//             periodName,
//             selectors,
//             durationHours,
//             isMonthly
//           );
//           if (result.success) scrapedData = scrapedData.concat(result.data);
//           else
//             errors.push(
//               `Daily scrape failed for ${carName}: ${result.message}`
//             );
//         }

//         if (weeklyCheck) {
//           const sinceDate = new Date(pickupDate);
//           const untilDate = new Date(pickupDate);
//           untilDate.setDate(sinceDate.getDate() + 7);
//           const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
//           const untilDateTime = new Date(
//             `${untilDate.toISOString().split("T")[0]}T${baseTime}`
//           ).getTime();
//           const durationHours =
//             (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
//           const periodName = `${new Date(
//             sinceDateTime
//           ).toLocaleString()} - ${new Date(untilDateTime).toLocaleString()}`;
//           const isMonthly = durationHours >= 720;
//           const durationMonths = isMonthly ? Math.ceil(durationHours / 720) : 0;
//           const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${durationMonths}${
//             isMonthly ? "&is_monthly=true" : ""
//           }&sort_by=price&sort_order=asc`;
//           console.log(`Navigating to URL: ${mainUrl}`);
//           await page.goto(mainUrl, {
//             waitUntil: "domcontentloaded",
//             timeout: 50000,
//           });

//           await scrollPage(page);
//           const result = await scrapeCarData(
//             page,
//             carName,
//             periodName,
//             selectors,
//             durationHours,
//             isMonthly
//           );
//           if (result.success) scrapedData = scrapedData.concat(result.data);
//           else
//             errors.push(
//               `Weekly scrape failed for ${carName}: ${result.message}`
//             );
//         }

//         if (monthlyCheck && monthlyData && monthlyData.months) {
//           const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
//           const untilDate = new Date(pickupDate);
//           untilDate.setMonth(untilDate.getMonth() + monthlyData.months);
//           const untilDateTime = new Date(
//             `${untilDate.toISOString().split("T")[0]}T${baseTime}`
//           ).getTime();
//           const durationHours =
//             (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
//           const periodName = `${monthlyData.months} Month${
//             monthlyData.months > 1 ? "s" : ""
//           } from ${new Date(sinceDateTime).toLocaleString()}`;
//           const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${monthlyData.months}&is_monthly=true&sort_by=price&sort_order=asc`;
//           console.log(`Navigating to URL: ${mainUrl}`);
//           await page.goto(mainUrl, {
//             waitUntil: "domcontentloaded",
//             timeout: 50000,
//           });
//           await scrollPage(page);
//           const result = await scrapeCarData(
//             page,
//             carName,
//             periodName,
//             selectors,
//             durationHours,
//             true
//           );
//           if (result.success) scrapedData = scrapedData.concat(result.data);
//           else
//             errors.push(
//               `Monthly scrape failed for ${carName}: ${result.message}`
//             );
//         }
//       } catch (error) {
//         errors.push(`Failed to scrape ${carName}: ${error.message}`);
//       } finally {
//         await page.close();
//       }
//     }

//     // if (captchaDetected) {
//     //   return {
//     //     success: false,
//     //     message:
//     //       "CAPTCHA detected on the website. Manual intervention required.",
//     //   };
//     // }

//     if (scrapedData.length === 0) {
//       return {
//         success: false,
//         message:
//           errors.length > 0
//             ? errors.join("; ")
//             : "No data scraped. Check car names or website availability.",
//       };
//     }

//     return {
//       success: true,
//       message:
//         errors.length > 0
//           ? `Scraping completed with errors: ${errors.join("; ")}`
//           : "Scraping completed successfully.",
//       data: scrapedData,
//     };
//   } catch (error) {
//     return { success: false, message: error.message };
//   } finally {
//     await context.close();
//     await browser.close();
//   }
// }

// // API Endpoints
// app.post("/api/scrape", async (req, res) => {
//   const {
//     carNames,
//     dailyCheck,
//     weeklyCheck,
//     monthlyCheck,
//     pickupDate,
//     dropOffDate,
//     monthlyData,
//   } = req.body;
//   isScrapingCancelled = false;
//   const result = await scrapeCars(
//     carNames,
//     dailyCheck,
//     weeklyCheck,
//     monthlyCheck,
//     pickupDate,
//     dropOffDate,
//     monthlyData || {}
//   );
//   res.json(result);
// });

// app.post("/api/cancel-scrape", (req, res) => {
//   isScrapingCancelled = true;
//   res.json({ success: true, message: "Scraping cancellation requested." });
// });

// app.get("/api/years", (req, res) => {
//   const years = [
//     ...new Set(
//       scrapedData.map((item) => item.Year).filter((year) => year !== "N/A")
//     ),
//   ].sort();
//   res.json(years);
// });

// app.get("/api/car-names", (req, res) => {
//   const carNames = [
//     ...new Set(scrapedData.map((item) => item["Car Name"])),
//   ].sort();
//   res.json(carNames);
// });

// app.post("/api/download-excel", async (req, res) => {
//   let { carNames, year } = req.body;
//   let filteredData = scrapedData;
//   if (carNames && carNames.length > 0 && carNames[0] !== "") {
//     filteredData = filteredData.filter((item) =>
//       carNames.includes(item["Car Name"])
//     );
//   }
//   if (year) filteredData = filteredData.filter((item) => item.Year === year);

//   if (filteredData.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "No data matches the selected filters",
//     });
//   }

//   const worksheet = xlsx.utils.json_to_sheet(filteredData);
//   const workbook = xlsx.utils.book_new();
//   xlsx.utils.book_append_sheet(workbook, worksheet, "Car Data");

//   let fileNameParts = [];
//   if (carNames && carNames.length > 0 && carNames[0] !== "") {
//     fileNameParts.push(carNames.map(formatCarNameForFile).join("_"));
//   } else {
//     fileNameParts.push("all_cars");
//   }
//   if (year) fileNameParts.push(year);
//   const timestamp = Date.now();
//   const fileName = `car_data_${fileNameParts.join("_")}_${timestamp}.xlsx`;

//   const tempDir = path.join(__dirname, "temp");
//   if (!fs.existsSync(tempDir)) {
//     fs.mkdirSync(tempDir);
//   }

//   const filePath = path.join(tempDir, fileName);
//   xlsx.writeFile(workbook, filePath);

//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Error sending file:", err);
//       res
//         .status(500)
//         .json({ success: false, message: "Failed to download file" });
//     }
//     fs.unlink(filePath, (err) => {
//       if (err) console.error("Error deleting temp file:", err);
//     });
//   });
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

//......................................scroolling fixed code.............
// const express = require("express");
// const { chromium } = require("playwright");
// const xlsx = require("xlsx");
// const path = require("path");
// const fs = require("fs");
// const cors = require("cors");

// const app = express();
// app.use(
//   cors({
//     origin: "*",
//     credentials: true,
//   })
// );

// app.use(express.json());
// app.use(express.static(path.join(__dirname, "public")));

// let scrapedData = [];
// let isScrapingCancelled = false;

// function validateCarName(carName) {
//   const invalidChars = /[^a-zA-Z0-9\s-]/g;
//   if (!carName || carName.length < 2) {
//     return {
//       valid: false,
//       message: `Car name "${carName}" must be at least 2 characters long`,
//     };
//   }
//   if (invalidChars.test(carName)) {
//     return {
//       valid: false,
//       message: `Car name "${carName}" contains invalid characters. Use letters, numbers, spaces, or hyphens only.`,
//     };
//   }
//   return { valid: true };
// }

// function formatCarNameForUrl(carName) {
//   return carName.toLowerCase().replace(/\s+/g, "/");
// }

// function formatCarNameForFile(carName) {
//   return carName.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
// }

// async function scrollPage(page) {
//   let lastHeight = await page.evaluate(() => document.body.scrollHeight);
//   let attempts = 0;
//   const maxAttempts = 3;

//   while (attempts < maxAttempts) {
//     // Check if "You may also like" section is visible
//     const isVisible = await page.evaluate(() => {
//       const target = document.querySelector(
//         ".Heading_Heading__PjLg8.SimilarOffers_SimilarOffersHeading__NWX_k"
//       );
//       return target && target.innerText.includes("You may also like");
//     });

//     if (isVisible) {
//       console.log('"You may also like" section found. Stopping scroll.');
//       break;
//     }

//     // Scroll down
//     await page.evaluate(() => window.scrollBy(0, 1000));
//     await page.waitForTimeout(5000);

//     // Check if scroll height changed
//     const newHeight = await page.evaluate(() => document.body.scrollHeight);
//     if (newHeight === lastHeight) {
//       attempts++;
//     } else {
//       attempts = 0;
//       lastHeight = newHeight;
//     }

//     if (typeof isScrapingCancelled !== "undefined" && isScrapingCancelled) {
//       throw new Error("Scraping cancelled by user");
//     }
//   }
// }

// async function scrapeCarData(
//   page,
//   carName,
//   periodName,
//   selectors,
//   durationHours,
//   isMonthly
// ) {
//   try {
//     await page.waitForSelector(selectors.title, { timeout: 3000 });
//     await page.waitForSelector(selectors.features, { timeout: 3000 });
//     await page.waitForSelector(selectors.price, { timeout: 3000 });

//     let results = [];
//     let retryCount = 0;
//     const maxRetries = 1;
//     const inputFirstWord = carName.toLowerCase().split(" ")[0];

//     while (retryCount < maxRetries) {
//       results = await page.evaluate(
//         ({
//           carName,
//           periodName,
//           selectors,
//           durationHours,
//           isMonthly,
//           inputFirstWord,
//         }) => {
//           const results = [];
//           const carElements = document.querySelectorAll(selectors.title);
//           const featureDivs = document.querySelectorAll(selectors.features);
//           const priceDivs = document.querySelectorAll(selectors.price);

//           console.log(
//             `Found ${carElements.length} cars for ${carName} (${periodName})`
//           );

//           for (let index = 0; index < carElements.length; index++) {
//             const carElement = carElements[index];
//             const carNameText = carElement.textContent.trim();
//             const carFirstWord = carNameText.toLowerCase().split(" ")[0];

//             // Stop scraping if the first word of the car name doesn't match
//             if (carFirstWord !== inputFirstWord) {
//               console.log(
//                 `Stopping scrape: Found different car name "${carNameText}"`
//               );
//               break;
//             }

//             const data = {};
//             data["Car Name"] = carNameText || "N/A";

//             const ancestorContainer = carElement.closest("div");
//             if (!ancestorContainer) continue;

//             const modelElement = ancestorContainer.querySelector(
//               selectors.model
//             );
//             const modelText = modelElement
//               ? modelElement.textContent.trim()
//               : "N/A";
//             data["Model"] = modelText;
//             const yearMatch = modelText.match(/\d{4}/);
//             data["Year"] = yearMatch ? yearMatch[0] : "N/A";

//             const featureDiv = featureDivs[index];
//             if (featureDiv) {
//               const spanElements = featureDiv.querySelectorAll(
//                 selectors.featureSpans
//               );
//               const featureTexts = Array.from(spanElements)
//                 .map((span) => span.textContent.trim())
//                 .filter((text) => text);
//               data["Description"] =
//                 featureTexts.length > 0 ? featureTexts.join(", ") : "N/A";
//               data["Description"] =
//                 data["Description"] === "N/A"
//                   ? data["Description"]
//                   : data["Description"].replace(/\s+/g, " ").trim();
//             } else {
//               data["Description"] = "N/A";
//             }

//             const priceDiv = priceDivs[index];
//             if (priceDiv) {
//               const pElements = priceDiv.querySelectorAll("p");
//               const spanElements = priceDiv.querySelectorAll("span");
//               data["Cross Price"] = pElements[0]
//                 ? pElements[0].textContent.trim()
//                 : "N/A";
//               data["Actual Price"] = pElements[1]
//                 ? pElements[1].textContent.trim()
//                 : "N/A";
//               if (durationHours > 24 && !isMonthly && spanElements[2]) {
//                 data["Total"] = spanElements[2].textContent.trim() || "N/A";
//               } else {
//                 data["Total"] = "N/A";
//               }
//             } else {
//               data["Cross Price"] = "N/A";
//               data["Actual Price"] = "N/A";
//               data["Total"] = "N/A";
//             }

//             data["Original Vehicle"] = carName;
//             data["Period"] = periodName;

//             if (Object.keys(data).length > 0) {
//               results.push(data);
//             }
//           }
//           return results;
//         },
//         {
//           carName,
//           periodName,
//           selectors,
//           durationHours,
//           isMonthly,
//           inputFirstWord,
//         }
//       );

//       if (results.length > 0) break;
//       console.log(
//         `Retrying scrape for ${carName} (${periodName}), attempt ${
//           retryCount + 1
//         }`
//       );
//       await scrollPage(page);
//       retryCount++;
//     }

//     if (results.length === 0) {
//       console.log(
//         `No data scraped for ${carName} (${periodName}) after ${maxRetries} retries`
//       );
//       return {
//         success: false,
//         message: `No data found for ${carName} (${periodName})`,
//         data: [],
//       };
//     }

//     return { success: true, data: results };
//   } catch (error) {
//     let message = error.message;
//     if (error.message.includes("Timeout")) {
//       message = "First check on website for car name on Yango drive ";
//     } else if (error.message.includes("cancelled")) {
//       message = "Scraping was cancelled by the user.";
//     }
//     console.error(
//       `Error scraping data for ${carName} (${periodName}):`,
//       message
//     );
//     return { success: false, message, data: [] };
//   }
// }

// async function scrapeCars(
//   carNames,
//   dailyCheck,
//   weeklyCheck,
//   monthlyCheck,
//   pickupDate,
//   dropOffDate,
//   monthlyData
// ) {
//   const errors = [];
//   for (const carName of carNames) {
//     const validation = validateCarName(carName);
//     if (!validation.valid) {
//       errors.push(validation.message);
//     }
//   }
//   if (errors.length > 0) {
//     return { success: false, message: errors.join("; ") };
//   }

//   const now = new Date();
//   now.setHours(now.getHours()+7);
//   const baseTime = now.toTimeString().split(" ")[0]; // "15:03:00"

//   const browser = await chromium.launch({ headless: true });
//   const context = await browser.newContext();
//   await context.setExtraHTTPHeaders({
//     "User-Agent":
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
//     "Accept-Language": "en-US,en;q=0.9",
//     Accept:
//       "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
//   });

//   const selectors = {
//     title: 'span[class*="Card_CardTitleMedium__korrS"]',
//     features:
//       'div[class*="HStack_HStack__bHoaj Card_CardBubbles__zuOuw HStack_gap__ml__UeOp6"]',
//     price:
//       'div[class*="Heading_Heading__PjLg8 Card_CardPrice__spWUR Heading_left__Xd02k"]',
//     model: 'span[class*="ButtonSimilarInfo_ButtonSimilarInfoPrefix___Qou3"]',
//     featureSpans:
//       'span[class*="Text_Text__F4Wpv Card_CardBubble__zukT3 Text_color_Gray__1IX1U"]',
//   };

//   scrapedData = [];

//   try {
//     for (const carName of carNames) {
//       const formattedCarName = formatCarNameForUrl(carName.toLowerCase());
//       const page = await context.newPage();
//       try {
//         if (dailyCheck) {
//           const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
//           const untilDateTime = new Date(
//             `${dropOffDate}T${baseTime}`
//           ).getTime();
//           const durationHours =
//             (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
//           const periodName = `${new Date(
//             sinceDateTime
//           ).toLocaleString()} - ${new Date(untilDateTime).toLocaleString()}`;
//           const isMonthly = durationHours >= 720;
//           const durationMonths = isMonthly ? Math.ceil(durationHours / 720) : 0;
//           const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${durationMonths}${
//             isMonthly ? "&is_monthly=true" : ""
//           }&sort_by=price&sort_order=asc`;
//           console.log(`Navigating to URL: ${mainUrl}`);
//           await page.goto(mainUrl, {
//             waitUntil: "domcontentloaded",
//             timeout: 50000,
//           });

//           await scrollPage(page);
//           const result = await scrapeCarData(
//             page,
//             carName,
//             periodName,
//             selectors,
//             durationHours,
//             isMonthly
//           );
//           if (result.success) scrapedData = scrapedData.concat(result.data);
//           else
//             errors.push(
//               `Daily scrape failed for ${carName}: ${result.message}`
//             );
//         }

//         if (weeklyCheck) {
//           const sinceDate = new Date(pickupDate);
//           const untilDate = new Date(pickupDate);
//           untilDate.setDate(sinceDate.getDate() + 7);
//           const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
//           const untilDateTime = new Date(
//             `${untilDate.toISOString().split("T")[0]}T${baseTime}`
//           ).getTime();
//           const durationHours =
//             (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
//           const periodName = `${new Date(
//             sinceDateTime
//           ).toLocaleString()} - ${new Date(untilDateTime).toLocaleString()}`;
//           const isMonthly = durationHours >= 720;
//           const durationMonths = isMonthly ? Math.ceil(durationHours / 720) : 0;
//           const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${durationMonths}${
//             isMonthly ? "&is_monthly=true" : ""
//           }&sort_by=price&sort_order=asc`;
//           console.log(`Navigating to URL: ${mainUrl}`);
//           await page.goto(mainUrl, {
//             waitUntil: "domcontentloaded",
//             timeout: 50000,
//           });

//           await scrollPage(page);
//           const result = await scrapeCarData(
//             page,
//             carName,
//             periodName,
//             selectors,
//             durationHours,
//             isMonthly
//           );
//           if (result.success) scrapedData = scrapedData.concat(result.data);
//           else
//             errors.push(
//               `Weekly scrape failed for ${carName}: ${result.message}`
//             );
//         }

//         if (monthlyCheck && monthlyData && monthlyData.months) {
//           const sinceDateTime = new Date(`${pickupDate}T${baseTime}`).getTime();
//           const untilDate = new Date(pickupDate);
//           untilDate.setMonth(untilDate.getMonth() + monthlyData.months);
//           const untilDateTime = new Date(
//             `${untilDate.toISOString().split("T")[0]}T${baseTime}`
//           ).getTime();
//           const durationHours =
//             (untilDateTime - sinceDateTime) / (1000 * 60 * 60);
//           const periodName = `${monthlyData.months} Month${
//             monthlyData.months > 1 ? "s" : ""
//           } from ${new Date(sinceDateTime).toLocaleString()}`;
//           const mainUrl = `https://drive.yango.com/search/all/${formattedCarName}?since=${sinceDateTime}&until=${untilDateTime}&duration_months=${monthlyData.months}&is_monthly=true&sort_by=price&sort_order=asc`;
//           console.log(`Navigating to URL: ${mainUrl}`);
//           await page.goto(mainUrl, {
//             waitUntil: "domcontentloaded",
//             timeout: 50000,
//           });
//           await scrollPage(page);
//           const result = await scrapeCarData(
//             page,
//             carName,
//             periodName,
//             selectors,
//             durationHours,
//             true
//           );
//           if (result.success) scrapedData = scrapedData.concat(result.data);
//           else
//             errors.push(
//               `Monthly scrape failed for ${carName}: ${result.message}`
//             );
//         }
//       } catch (error) {
//         errors.push(`Failed to scrape ${carName}: ${error.message}`);
//       } finally {
//         await page.close();
//       }
//     }

//     if (scrapedData.length === 0) {
//       return {
//         success: false,
//         message:
//           errors.length > 0
//             ? errors.join("; ")
//             : "No data scraped. Check car names or website availability.",
//       };
//     }

//     return {
//       success: true,
//       message:
//         errors.length > 0
//           ? `Scraping completed with errors: ${errors.join("; ")}`
//           : "Scraping completed successfully.",
//       data: scrapedData,
//     };
//   } catch (error) {
//     return { success: false, message: error.message };
//   } finally {
//     await context.close();
//     await browser.close();
//   }
// }

// // API Endpoints
// app.post("/api/scrape", async (req, res) => {
//   const {
//     carNames,
//     dailyCheck,
//     weeklyCheck,
//     monthlyCheck,
//     pickupDate,
//     dropOffDate,
//     monthlyData,
//   } = req.body;
//   isScrapingCancelled = false;
//   const result = await scrapeCars(
//     carNames,
//     dailyCheck,
//     weeklyCheck,
//     monthlyCheck,
//     pickupDate,
//     dropOffDate,
//     monthlyData || {}
//   );
//   res.json(result);
// });

// app.post("/api/cancel-scrape", (req, res) => {
//   isScrapingCancelled = true;
//   res.json({ success: true, message: "Scraping cancellation requested." });
// });

// app.get("/api/years", (req, res) => {
//   const years = [
//     ...new Set(
//       scrapedData.map((item) => item.Year).filter((year) => year !== "N/A")
//     ),
//   ].sort();
//   res.json(years);
// });

// app.get("/api/car-names", (req, res) => {
//   const carNames = [
//     ...new Set(scrapedData.map((item) => item["Car Name"])),
//   ].sort();
//   res.json(carNames);
// });

// app.post("/api/download-excel", async (req, res) => {
//   let { carNames, year } = req.body;
//   let filteredData = scrapedData;
//   if (carNames && carNames.length > 0 && carNames[0] !== "") {
//     filteredData = filteredData.filter((item) =>
//       carNames.includes(item["Car Name"])
//     );
//   }
//   if (year) filteredData = filteredData.filter((item) => item.Year === year);

//   if (filteredData.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "No data matches the selected filters",
//     });
//   }

//   const worksheet = xlsx.utils.json_to_sheet(filteredData);
//   const workbook = xlsx.utils.book_new();
//   xlsx.utils.book_append_sheet(workbook, worksheet, "Car Data");

//   let fileNameParts = [];
//   if (carNames && carNames.length > 0 && carNames[0] !== "") {
//     fileNameParts.push(carNames.map(formatCarNameForFile).join("_"));
//   } else {
//     fileNameParts.push("all_cars");
//   }
//   if (year) fileNameParts.push(year);
//   const timestamp = Date.now();
//   const fileName = `car_data_${fileNameParts.join("_")}_${timestamp}.xlsx`;

//   const tempDir = path.join(__dirname, "temp");
//   if (!fs.existsSync(tempDir)) {
//     fs.mkdirSync(tempDir);
//   }

//   const filePath = path.join(tempDir, fileName);
//   xlsx.writeFile(workbook, filePath);

//   res.download(filePath, fileName, (err) => {
//     if (err) {
//       console.error("Error sending file:", err);
//       res
//         .status(500)
//         .json({ success: false, message: "Failed to download file" });
//     }
//     fs.unlink(filePath, (err) => {
//       if (err) console.error("Error deleting temp file:", err);
//     });
//   });
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
