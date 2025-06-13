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
      messageEl.classList.add("text-red");
      return;
    }
    if (until <= since) {
      messageEl.textContent =
        "Until date and time must be after Since date and time";
      messageEl.classList.remove("hidden");
      messageEl.classList.add("text-red");
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

  try {
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carNames, sinceDateTime, untilDateTime, months }),
    });
    const { success, message } = await response.json();

    clearInterval(progressInterval);
    progressFill.style.width = success ? "100%" : "0%";
    setTimeout(() => progressBar.classList.add("hidden"), 500);

    messageEl.textContent = message;
    messageEl.classList.remove("hidden");
    messageEl.classList.toggle("text-red-500", !success);
    messageEl.classList.toggle("text-green-500", success);

    if (success) {
      filterSection.classList.remove("hidden");

      // Fetch years
      const yearsResponse = await fetch("/api/years");
      const years = await yearsResponse.json();
      yearFilter.innerHTML =
        '<option value="">All Years</option>' +
        years
          .map((year) => `<option value="${year}">${year}</option>`)
          .join("");

      // Fetch car names
      const carNamesResponse = await fetch("/api/car-names");
      const carNamesList = await carNamesResponse.json();
      carNameFilter.innerHTML =
        '<option value="">All Cars</option>' +
        carNamesList
          .map((name) => `<option value="${name}">${name}</option>`)
          .join("");
    }
  } catch (error) {
    clearInterval(progressInterval);
    progressFill.style.width = "0%";
    setTimeout(() => progressBar.classList.add("hidden"), 500);
    messageEl.textContent = "Error: " + error.message;
    messageEl.classList.remove("hidden");
    messageEl.classList.add("text-red-500");
  } finally {
    scrapeBtn.disabled = false;
    scrapeText.classList.remove("hidden");
    scrapeSpinner.classList.add("hidden");
    cancelBtn.classList.add("hidden");
    filterSection.classList.remove("opacity-50", "pointer-events-none");
  }
});

document.getElementById("cancelBtn").addEventListener("click", async () => {
  const messageEl = document.getElementById("message");
  try {
    const response = await fetch("/api/cancel-scrape", { method: "POST" });
    const { success, message } = await response.json();
    messageEl.textContent = message;
    messageEl.classList.remove("hidden");
    messageEl.classList.add("text-red-500");
  } catch (error) {
    messageEl.textContent = "Error cancelling scrape: " + error.message;
    messageEl.classList.remove("hidden");
    messageEl.classList.add("text-red-500");
  }
});

document.getElementById("downloadBtn").addEventListener("click", async () => {
  const carNames = Array.from(
    document.getElementById("carNameFilter").selectedOptions
  ).map((option) => option.value);
  const year = document.getElementById("yearFilter").value;
  const messageEl = document.getElementById("message");

  try {
    const response = await fetch("/api/download-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carNames, year }),
    });

    if (!response.ok) {
      const { message } = await response.json();
      messageEl.textContent = message;
      messageEl.classList.remove("hidden");
      messageEl.classList.add("text-red-500");
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition");
    const fileName = disposition
      ? disposition.split("filename=")[1].replace(/"/g, "")
      : "car_data.xlsx";
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    messageEl.textContent = "Excel file downloaded successfully";
    messageEl.classList.remove("hidden");
    messageEl.classList.remove("text-red-500");
    messageEl.classList.add("text-green-500");
  } catch (error) {
    messageEl.textContent = "Error downloading file: " + error.message;
    messageEl.classList.remove("hidden");
    messageEl.classList.add("text-red-500");
  }
});
