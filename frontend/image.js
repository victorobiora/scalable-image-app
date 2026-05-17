import { API_BASE, getApiKey } from "./utils.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

let currentItem = null;

// load images and data associated with it
async function loadImage() {
  const res = await fetch(`${API_BASE}/media`, {
    headers: { "x-api-key": getApiKey() },
  });

  const items = await res.json();
  currentItem = items.find((i) => i.id === id);

  if (!currentItem) {
    document.getElementById("image-container").innerText = "Image not found";
    return;
  }

  renderImage();
  renderComments();
}

// render images
function renderImage() {
  document.getElementById("heading-post-title").textContent = currentItem.title;

  const container = document.getElementById("image-container");

  container.innerHTML = `
    <div class="spinner"></div>
    <div id="single-image-container" style="display:none">
      <img id="fullImage" src="${currentItem.originalUrl}" style="max-width:50vw" />
    </div>

    <h3>${currentItem.title}</h3>
    <p>${currentItem.caption}</p>
    <p>📍Location: ${currentItem.location}</p>
    <p>❤️ Likes: ${currentItem.likes}</p>
    <p>⭐ Average Rating: ${currentItem.averageRating?.toFixed(1) || 0}</p>
  `;

  const img = document.getElementById("fullImage");
  const spinner = container.querySelector(".spinner");
  const imageWrapper = document.getElementById("single-image-container");

  img.onload = () => {
    spinner.remove();
    imageWrapper.style.display = "flex";
  };

  img.onerror = () => {
    spinner.remove();
    imageWrapper.style.display = "flex";
  };
}

function renderComments() {
  const ul = document.getElementById("comments");
  ul.innerHTML = "";

  (currentItem.comments || []).forEach((c) => {
    const li = document.createElement("li");
    li.innerText = c.text;
    ul.appendChild(li);
  });
}

// like
document.getElementById("likeBtn").onclick = async () => {
  await fetch(`${API_BASE}/media/${id}/like`, {
    method: "POST",
    headers: { "x-api-key": getApiKey() },
  });

  await loadImage();
};

// rating
document.getElementById("rateBtn").onclick = async () => {
  const rating = Number(document.getElementById("ratingSelect").value);
  if (!rating) {
    alert("Select a rating");
    return;
  }

  await fetch(`${API_BASE}/media/${id}/rate`, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rating }),
  });

  await loadImage();
};

// comment
document.getElementById("commentBtn").onclick = async () => {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if (!text) return;

  await fetch(`${API_BASE}/media/${id}/comment`, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  input.value = "";
  await loadImage();
};

loadImage();
