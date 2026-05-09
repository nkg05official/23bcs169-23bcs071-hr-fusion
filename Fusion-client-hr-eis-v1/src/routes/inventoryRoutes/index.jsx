import { host } from "../globalRoutes";

export const InventoryRequest = `${host}/inventory/api/requests/`;
export const InventoryData = `${host}/inventory/api/item-count/`;
export const InventorySections = (selectedDepartment) =>
  `${host}/inventory/api/sections/?section=${selectedDepartment}`;
export const InventoryDepartments = (selectedDepartment) =>
  `${host}/inventory/api/departments/?department=${selectedDepartment}`;
export const InventoryAdd = (val) => `${host}/inventory/api/${val}/`;
export const InventoryTransfer = `${host}/inventory/api/transfer_product/`;
