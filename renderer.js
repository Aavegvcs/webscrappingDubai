document.getElementById("scrapeBtn").addEventListener("click", async () => {
  const carNamesInput = document.getElementById("carNames").value.trim();
  const messageEl = document.getElementById("message");
  const scrapeBtn = document.getElementById("scrapeBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const scrapeText = document.getElementById("scrapeText");
  const scrapeSpinner = document.getElementById("scrapeSpinner");
  const progressBar = document.getElementById("progressBar");
  const progressFill = document.getElementById("progressFill");
  const filterSection = document.getElementById("filterSection");
  const yearFilter = document.getElementById("yearFilter");
  const carNameFilter = document.getElementById("carNameFilter");
  const periodFilter = document.getElementById("periodFilter");
  const downloadBtn = document.getElementById("downloadBtn");

  if (!carNamesInput) {
    messageEl.textContent = "Please enter at least one car name";
    messageEl.classList.remove("hidden");
    messageEl.classList.add("text-red-500");
    return;
  }

  const carNames = carNamesInput
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name);

  // Disable UI and show progress
  scrapeBtn.disabled = true;
  scrapeText.classList.add("hidden");
  scrapeSpinner.classList.remove("hidden");
  cancelBtn.classList.remove("hidden");
  progressBar.classList.remove("hidden");
  filterSection.classList.add("opacity-50", "pointer-events-none");
  messageEl.classList.add("hidden");

  // Simulate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + 10, 90);
    progressFill.style.width = `${progress}%`;
  }, 1000);

  const { success, message } = await window.electronAPI.scrape(carNames);
  clearInterval(progressInterval);
  progressFill.style.width = success ? "100%" : "0%";
  setTimeout(() => progressBar.classList.add("hidden"), 500);

  messageEl.textContent = message;
  messageEl.classList.remove("hidden");
  messageEl.classList.toggle("text-red-500", !success);
  messageEl.classList.toggle("text-green-500", success);
  scrapeBtn.disabled = false;
  scrapeText.classList.remove("hidden");
  scrapeSpinner.classList.add("hidden");
  cancelBtn.classList.add("hidden");
  filterSection.classList.remove("opacity-50", "pointer-events-none");

  if (success) {
    filterSection.classList.remove("hidden");
    const years = await window.electronAPI.getYears();
    yearFilter.innerHTML =
      '<option value="">All Years</option>' +
      years.map((year) => `<option value="${year}">${year}</option>`).join("");

    const carNames = await window.electronAPI.getCarNames();
    carNameFilter.innerHTML =
      '<option value="">All Cars</option>' +
      carNames
        .map((name) => `<option value="${name}">${name}</option>`)
        .join("");

    const periods = ["Daily", "Weekly", "Monthly"];
    periodFilter.innerHTML =
      '<option value="">All Periods</option>' +
      periods
        .map((period) => `<option value="${period}">${period}</option>`)
        .join("");
  }
});

document.getElementById("cancelBtn").addEventListener("click", async () => {
  const messageEl = document.getElementById("message");
  const { success, message } = await window.electronAPI.cancelScrape();
  messageEl.textContent = message;
  messageEl.classList.remove("hidden");
  messageEl.classList.add("text-red-500");
});

document.getElementById("downloadBtn").addEventListener("click", async () => {
  const carNames = Array.from(
    document.getElementById("carNameFilter").selectedOptions
  ).map((option) => option.value);
  const year = document.getElementById("yearFilter").value;
  const period = document.getElementById("periodFilter").value;
  const messageEl = document.getElementById("message");

  const { success, message } = await window.electronAPI.downloadExcel({
    carNames,
    year,
    period,
  });
  messageEl.textContent = message;
  messageEl.classList.remove("hidden");
  messageEl.classList.toggle("text-red-500", !success);
  messageEl.classList.toggle("text-green-500", success);
});
