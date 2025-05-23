const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  scrape: ({ carNames, sinceDateTime, untilDateTime, months }) =>
    ipcRenderer.invoke("scrape", {
      carNames,
      sinceDateTime,
      untilDateTime,
      months,
    }),
  cancelScrape: () => ipcRenderer.invoke("cancel-scrape"),
  getYears: () => ipcRenderer.invoke("get-years"),
  getCarNames: () => ipcRenderer.invoke("get-car-names"),
  downloadExcel: (filters) => ipcRenderer.invoke("download-excel", filters),
});
