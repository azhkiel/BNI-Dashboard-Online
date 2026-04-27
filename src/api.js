//src/api.js
import BASE_URL from "./config";

export async function getAllData() {
  const res = await fetch(BASE_URL + "?action=read");
  return res.json();
}

export async function getAllDataSaw() {
  const res = await fetch(BASE_URL + "?action=read");
  return res.json();
}

export async function getAllDataTeller() {
  const res = await fetch(BASE_URL + "?action=read_teller");
  return res.json();
}

export async function getAllDataPasmar() {
  const res = await fetch(BASE_URL + "?action=read_pasmar");
  return res.json();
}

export async function createData(payload) {
  return fetch(BASE_URL + "?action=create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateData(payload) {
  return fetch(BASE_URL + "?action=update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteData(id) {
  return fetch(BASE_URL + "?action=delete", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
