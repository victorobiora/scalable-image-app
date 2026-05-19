const API_BASE = "https://scalable-api.mangopebble-09f3cea7.italynorth.azurecontainerapps.io";


function setCookie(name, value, days = 1) {
  document.cookie = `${name}=${value}; path=/; max-age=${days * 86400}`;
}

 function getCookie(name) {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : undefined;
}

async function fetchAndSetApiKeyBasedOnRole (role) {
  const res = await fetch(
    `${API_BASE}/get-key?role=${encodeURIComponent(role)}`,
    {
      method: "GET",
    }
  );

  const values = await res.json();

  document.cookie = `API_KEY=${encodeURIComponent(values.api_key)}; path=/; max-age=${1 * 86400}`;
}


function getApiKey() {
  return getCookie("API_KEY");
}

export {API_BASE, setCookie, getCookie, getApiKey, fetchAndSetApiKeyBasedOnRole }