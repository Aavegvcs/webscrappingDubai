
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  scrape: (carNames) => ipcRenderer.invoke("scrape", carNames),
  cancelScrape: () => ipcRenderer.invoke("cancel-scrape"),
  getYears: () => ipcRenderer.invoke("get-years"),
  getCarNames: () => ipcRenderer.invoke("get-car-names"),
  downloadExcel: (filters) => ipcRenderer.invoke("download-excel", filters),
});
