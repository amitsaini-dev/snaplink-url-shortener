console.log("🔥 SCRIPT LOADED");
const originalUrlInput = document.getElementById("originalUrl");
const shortCodeInput = document.getElementById("shortCode");
const aliasTypeInput = document.getElementById("aliasType");
const feedback = document.getElementById("alias-feedback");
const btnAI = document.getElementById("btn-ai");
const btnGen = document.getElementById("btn-generate");

// ── Show feedback below the buttons ─────────────────────────────
function showFeedback(message, colorClass) {
  feedback.innerHTML = `<span class="${colorClass}">${message}</span>`;
}

// ── Put alias into the field and highlight it ────────────────────
function setAlias(code, type) {
  shortCodeInput.value = code;
  aliasTypeInput.value = type;
  shortCodeInput.classList.add("border-success");
  setTimeout(() => shortCodeInput.classList.remove("border-success"), 1500);
}

// ── When user types manually, mark as custom ─────────────────────
shortCodeInput.addEventListener("input", () => {
  aliasTypeInput.value = "custom";
});

// ── Button: Generate random nanoid ──────────────────────────────
btnGen.addEventListener("click", async () => {
  showFeedback("⏳ Generating...", "text-muted");
  btnGen.disabled = true;

  try {
    // Calls GET /urls/generate on our backend
    // axios.get(url) — returns response.data already parsed as JSON
    const response = await axios.get("/urls/generate");
    setAlias(response.data.shortCode, "nanoid");
    showFeedback("✅ Random alias ready!", "text-success");
  } catch (err) {
    showFeedback("❌ Failed to generate alias", "text-danger");
  } finally {
    btnGen.disabled = false;
  }
});

// ── Button: AI alias ─────────────────────────────────────────────
btnAI.addEventListener("click", async () => {
  const url = originalUrlInput.value.trim();

  // Must have a URL before asking AI
  if (!url) {
    showFeedback("⚠️ Enter your long URL first, then click AI alias", "text-warning");
    originalUrlInput.focus();
    return;
  }

  showFeedback("🤖 Asking AI to suggest an alias...", "text-muted");
  btnAI.disabled = true;

  try {
    // Calls POST /urls/ai-alias on our backend
    // axios.post(url, data) — data is sent as JSON body automatically
    const response = await axios.post("/urls/ai-alias", {
      originalUrl: url
    });

    setAlias(response.data.shortCode, "ai");
    showFeedback("🤖 AI suggested this alias — edit it if you want!", "text-success");

  } catch (err) {
    // axios puts server error message in err.response.data
    const message = err.response?.data?.error || "AI alias failed. Try again.";
    showFeedback("❌ " + message, "text-danger");
  } finally {
    btnAI.disabled = false;
  }
});