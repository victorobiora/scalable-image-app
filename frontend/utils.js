const API_BASE = "https://scalable-api.mangopebble-09f3cea7.italynorth.azurecontainerapps.io";
const API_KEY = "08726&&5637890$^*:SJHDEIsumer123";
const CREATOR_API_KEY = "juhvidgnk;pio9974j;P9F83Ejmsvbdjkk94RYS*&^%reato3";

function setCookie(name, value, days = 1) {
  document.cookie = `${name}=${value}; path=/; max-age=${days * 86400}`;
}

 function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}


function getApiKey() {
  const role = getCookie("role");

  if (role === "creator") {
    return CREATOR_API_KEY;
  }
  return API_KEY;
}


export {API_BASE, API_KEY, CREATOR_API_KEY, setCookie, getCookie, getApiKey}