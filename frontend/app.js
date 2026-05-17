import * as generalFunctionsAndData from "./utils.js";

///making upload only visible to creator ///////////////
const creatorSection = document.getElementById("creator-only");

const updateView = () => {
  if (generalFunctionsAndData.getCookie("role") === "creator") {
    creatorSection.style.display = "block";
  } else {
    creatorSection.style.display = "none";
  }
};

///////HANDLING WHAT ROLE THE USER IS /////////////////////////
document.querySelectorAll("input[name='role']").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    generalFunctionsAndData.setCookie("role", e.target.value);
    updateView();
  });
});

if (!generalFunctionsAndData.getCookie("role")) {
  generalFunctionsAndData.setCookie("role", "creator");
}

//////////////other functions to upload and load media ///////////////////////

function renderMediaItem(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "media-item";

  const spinner = document.createElement("div");
  spinner.className = "spinner spinner-overlay";

  const img = document.createElement("img");
  img.style.display = "none";

  if (item.thumbnailReady) {
    img.src = item.thumbnailUrl + "?v=" + (item.thumbUpdatedAt || Date.now());
  } else {
    img.classList.add("placeholder");
  }

  img.onload = () => {
    spinner.remove();
    img.style.display = "block";
  };

  img.onerror = () => {
    spinner.remove();
    img.style.display = "block";
  };

  img.style.cursor = "pointer";
  img.onclick = () => {
    window.location.href = `${window.location.origin}/image.html?id=${item.id}`;
  };

  wrapper.appendChild(spinner);
  wrapper.appendChild(img);

  return wrapper;
}

function loadMedia() {
  const gallery = document.getElementById("media");
  gallery.innerHTML = `<div class="spinner"></div>`;

  fetch(`${generalFunctionsAndData.API_BASE}/media`, {
    headers: { "x-api-key": generalFunctionsAndData.getApiKey() },
  })
    .then((res) => res.json())
    .then((items) => {
      gallery.innerHTML = "";

      items.forEach((item) => {
        const el = renderMediaItem(item);
        gallery.appendChild(el);
      });
    });
}


async function uploadImage() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) {
    alert("Select a file first");
    return;
  }

  //  Get upload intent
  const intentRes = await fetch(
    `${generalFunctionsAndData.API_BASE}/media/upload-intent`,
    {
      method: "POST",
      headers: {
        "x-api-key": generalFunctionsAndData.getApiKey(),
      },
    }
  );

  const { uploadUrl, blobName } = await intentRes.json();

  try {
    //  Upload directly to Blob using SAS
    await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": file.type,
      },
      body: file,
    });

    // Confirm upload + metadata
    await fetch(`${generalFunctionsAndData.API_BASE}/media/confirm`, {
      method: "POST",
      headers: {
        "x-api-key": generalFunctionsAndData.getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blobName,
        title: document.getElementById("title").value,
        caption: document.getElementById("caption").value,
        location: document.getElementById("location").value,
        people: [],
      }),
    });

    // Reset UI
    fileInput.value = "";
    document.getElementById("title").value = "";
    document.getElementById("caption").value = "";
    document.getElementById("location").value = "";

    loadMedia();
    setTimeout(loadMedia, 6000);
  } catch (err) {
    alert("of course this failed ");
  }
}

document.getElementById("upload-image").onclick = () => {
  uploadImage().catch((err) => {
    console.log(error);
  });
};

loadMedia();
