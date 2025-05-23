document.getElementById("scrapeBtn").addEventListener("click", async () => {
  const carNamesInput = document.getElementById("carNames").value.trim();
  const sinceDateInput = document.getElementById("sinceDate").value;
  const sinceTimeInput = document.getElementById("sinceTime").value;
  const untilDateInput = document.getElementById("untilDate").value;
  const untilTimeInput = document.getElementById("untilTime").value;
  const monthsInput = document.getElementById("monthsInput").value;
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
  const downloadBtn = document.getElementById("downloadBtn");

  // Input validation
  if (!carNamesInput) {
    messageEl.textContent = "Please enter at least one car name";
    messageEl.classList.remove("hidden");
    messageEl.classList.add("text-red-500");
    return;
  }

  let sinceDateTime, untilDateTime, months;
  if (monthsInput && monthsInput > 0) {
    months = parseInt(monthsInput);
    if (isNaN(months) || months < 1) {
      messageEl.textContent = "Months must be a positive number";
      messageEl.classList.remove("hidden");
      messageEl.classList.add("text-red-500");
      return;
    }
  } else {
    if (
      !sinceDateInput ||
      !sinceTimeInput ||
      !untilDateInput ||
      !untilTimeInput
    ) {
      messageEl.textContent =
        "Please provide both Since and Until date and time";
      messageEl.classList.remove("hidden");
      messageEl.classList.add("text-red-500");
      return;
    }
    sinceDateTime = `${sinceDateInput}T${sinceTimeInput}`;
    untilDateTime = `${untilDateInput}T${untilTimeInput}`;
    const since = new Date(sinceDateTime);
    const until = new Date(untilDateTime);
    const now = new Date();
    if (since < now) {
      messageEl.textContent = "Since date and time cannot be in the past";
      messageEl.classList.remove("hidden");
      messageEl.classList.add("text-red-500");
      return;
    }
    if (until <= since) {
      messageEl.textContent =
        "Until date and time must be after Since date and time";
      messageEl.classList.remove("hidden");
      messageEl.classList.add("text-red-500");
      return;
    }
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

  const { success, message } = await window.electronAPI.scrape({
    carNames,
    sinceDateTime,
    untilDateTime,
    months,
  });
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

    const carNamesList = await window.electronAPI.getCarNames();
    carNameFilter.innerHTML =
      '<option value="">All Cars</option>' +
      carNamesList
        .map((name) => `<option value="${name}">${name}</option>`)
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
  const messageEl = document.getElementById("message");

  const { success, message } = await window.electronAPI.downloadExcel({
    carNames,
    year,
  });
  messageEl.textContent = message;
  messageEl.classList.remove("hidden");
  messageEl.classList.toggle("text-red-500", !success);
  messageEl.classList.toggle("text-green-500", success);
});
