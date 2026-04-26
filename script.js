const API_BASE = "http://localhost:4001";

const STORAGE_KEYS = {
	token: "token",
	email: "userEmail",
	resumeId: "resumeId",
	latestResult: "latestResult",
};

async function apiRequest(endpoint, method = "GET", body = null) {
	const token = localStorage.getItem(STORAGE_KEYS.token);
	const headers = {
		Accept: "application/json",
	};

	let requestBody = null;

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	if (body instanceof FormData) {
		requestBody = body;
	} else if (body !== null && body !== undefined) {
		headers["Content-Type"] = "application/json";
		requestBody = JSON.stringify(body);
	}

	const response = await fetch(`${API_BASE}${endpoint}`, {
		method,
		headers,
		body: requestBody,
	});

	const raw = await response.text();
	let data = null;

	try {
		data = raw ? JSON.parse(raw) : null;
	} catch (error) {
		data = raw;
	}

	if (!response.ok) {
		if (response.status === 401) {
			clearAuthAndState();
			window.location.href = "index.html?sessionExpired=1";
			throw new Error("Session expired. Please login again.");
		}

		const message =
			(data && typeof data === "object" && (data.message || data.error)) ||
			`Request failed with status ${response.status}`;
		throw new Error(message);
	}

	return data;
}

function showMessage(el, message) {
	if (!el) {
		return;
	}
	el.textContent = message || "";
}

function clearMessage(el) {
	if (!el) {
		return;
	}
	el.textContent = "";
}

function setButtonLoading(button, isLoading, loadingText = "Please wait...") {
	if (!button) {
		return;
	}

	if (!button.dataset.defaultText) {
		button.dataset.defaultText = button.textContent;
	}

	button.disabled = isLoading;
	button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

function saveAuth(token, email) {
	localStorage.setItem(STORAGE_KEYS.token, token);
	localStorage.setItem(STORAGE_KEYS.email, email || "");
}

function clearAuthAndState() {
	localStorage.removeItem(STORAGE_KEYS.token);
	localStorage.removeItem(STORAGE_KEYS.email);
	localStorage.removeItem(STORAGE_KEYS.resumeId);
	localStorage.removeItem(STORAGE_KEYS.latestResult);
}

function logout() {
	clearAuthAndState();
	window.location.href = "index.html";
}

function requireAuth() {
	const token = localStorage.getItem(STORAGE_KEYS.token);
	if (!token) {
		window.location.href = "index.html";
		return false;
	}
	return true;
}

function setupLogoutButton() {
	const logoutBtn = document.getElementById("logout-btn");
	if (logoutBtn) {
		logoutBtn.addEventListener("click", logout);
	}
}

function toList(value) {
	if (Array.isArray(value)) {
		return value.map((item) => String(item));
	}
	if (typeof value === "string") {
		return value
			.split(/[\n,]/)
			.map((part) => part.trim())
			.filter(Boolean);
	}
	if (value && typeof value === "object") {
		return Object.values(value).map((item) => String(item));
	}
	return [];
}

function pickFirst(obj, keys, fallback = null) {
	if (!obj || typeof obj !== "object") {
		return fallback;
	}
	for (const key of keys) {
		if (obj[key] !== undefined && obj[key] !== null) {
			return obj[key];
		}
	}
	return fallback;
}

function normalizeAnalysis(raw) {
	if (!raw || typeof raw !== "object") {
		return {};
	}
	return raw.analysis || raw.result || raw.data || raw;
}

function initAuthPage() {
	const authPage = document.getElementById("auth-page");
	if (!authPage) {
		return;
	}

	if (localStorage.getItem(STORAGE_KEYS.token)) {
		window.location.href = "dashboard.html";
		return;
	}

	const loginTab = document.querySelector('[data-tab="login"]');
	const registerTab = document.querySelector('[data-tab="register"]');
	const loginForm = document.getElementById("login-form");
	const registerForm = document.getElementById("register-form");
	const errorEl = document.getElementById("auth-error");
	const successEl = document.getElementById("auth-success");
	const params = new URLSearchParams(window.location.search);

	if (params.get("sessionExpired") === "1") {
		showMessage(errorEl, "Session expired. Please login again.");
	}

	function switchTab(tab) {
		const loginActive = tab === "login";
		loginTab.classList.toggle("active", loginActive);
		registerTab.classList.toggle("active", !loginActive);
		loginForm.classList.toggle("hidden", !loginActive);
		registerForm.classList.toggle("hidden", loginActive);
		clearMessage(errorEl);
		clearMessage(successEl);
	}

	loginTab.addEventListener("click", () => switchTab("login"));
	registerTab.addEventListener("click", () => switchTab("register"));

	loginForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		clearMessage(errorEl);
		clearMessage(successEl);

		const submitBtn = document.getElementById("login-btn");
		const email = loginForm.email.value.trim();
		const password = loginForm.password.value;

		setButtonLoading(submitBtn, true, "Logging in...");

		try {
			const response = await apiRequest("/login", "POST", { email, password });
			const token = pickFirst(response, ["token", "accessToken", "jwt"]);
			const userEmail = pickFirst(response, ["email", "userEmail"], email);

			if (!token) {
				throw new Error("No token returned from login response.");
			}

			saveAuth(token, userEmail);
			window.location.href = "dashboard.html";
		} catch (error) {
			showMessage(errorEl, error.message || "Login failed.");
		} finally {
			setButtonLoading(submitBtn, false);
		}
	});

	registerForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		clearMessage(errorEl);
		clearMessage(successEl);

		const submitBtn = document.getElementById("register-btn");
		const email = registerForm.email.value.trim();
		const password = registerForm.password.value;

		setButtonLoading(submitBtn, true, "Creating account...");

		try {
			const response = await apiRequest("/register", "POST", { email, password });
			const token = pickFirst(response, ["token", "accessToken", "jwt"]);

			if (token) {
				saveAuth(token, pickFirst(response, ["email", "userEmail"], email));
				window.location.href = "dashboard.html";
				return;
			}

			showMessage(successEl, "Registration complete. Please login.");
			switchTab("login");
			loginForm.email.value = email;
		} catch (error) {
			showMessage(errorEl, error.message || "Registration failed.");
		} finally {
			setButtonLoading(submitBtn, false);
		}
	});
}

async function initDashboardPage() {
	const dashboardPage = document.getElementById("dashboard-page");
	if (!dashboardPage) {
		return;
	}

	if (!requireAuth()) {
		return;
	}

	setupLogoutButton();

	const userEmailEl = document.getElementById("user-email");
	const historyLoading = document.getElementById("history-loading");
	const historyList = document.getElementById("history-list");
	const historyEmpty = document.getElementById("history-empty");
	const errorEl = document.getElementById("dashboard-error");

	userEmailEl.textContent = localStorage.getItem(STORAGE_KEYS.email) || "User";

	try {
		historyLoading.classList.remove("hidden");
		const response = await apiRequest("/history", "GET");
		const history = Array.isArray(response)
			? response
			: pickFirst(response, ["history", "items", "data"], []);

		historyList.innerHTML = "";

		if (!Array.isArray(history) || history.length === 0) {
			historyEmpty.classList.remove("hidden");
			return;
		}

		historyEmpty.classList.add("hidden");

		history.forEach((item) => {
			const role = pickFirst(item, ["role", "targetRole"], "Role not provided");
			const score = pickFirst(item, ["matchScore", "score"], "-");
			const createdAt = pickFirst(item, ["createdAt", "timestamp"], "Unknown date");
			const resumeId = pickFirst(item, ["resumeId", "id"], "");

			const card = document.createElement("article");
			card.className = "history-item";
			card.innerHTML = `
				<div class="history-top">
					<strong>${role}</strong>
					<span class="badge">${String(score).includes("%") ? score : `${score}%`}</span>
				</div>
				<p class="muted">${new Date(createdAt).toLocaleString()}</p>
				<button class="btn btn-ghost" type="button">View This Result</button>
			`;

			const button = card.querySelector("button");
			button.addEventListener("click", () => {
				localStorage.setItem(STORAGE_KEYS.resumeId, resumeId);
				localStorage.setItem(STORAGE_KEYS.latestResult, JSON.stringify(item));
				window.location.href = "result.html";
			});

			historyList.appendChild(card);
		});
	} catch (error) {
		showMessage(errorEl, error.message || "Failed to fetch history.");
	} finally {
		historyLoading.classList.add("hidden");
	}
}

function initUploadPage() {
	const uploadPage = document.getElementById("upload-page");
	if (!uploadPage) {
		return;
	}

	if (!requireAuth()) {
		return;
	}

	setupLogoutButton();

	const uploadForm = document.getElementById("upload-form");
	const errorEl = document.getElementById("upload-error");
	const analyzeBtn = document.getElementById("analyze-btn");
	const resumeFileInput = document.getElementById("resume-file");
	const roleInput = document.getElementById("role");
	const jobDescriptionInput = document.getElementById("job-description");

	uploadForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		clearMessage(errorEl);

		try {
			const file = resumeFileInput?.files?.[0];
			const role = roleInput?.value?.trim() || "";
			const jobDescription = jobDescriptionInput?.value?.trim() || "";

			if (!file) {
				showMessage(errorEl, "Please upload a PDF resume.");
				return;
			}

			if (!role || !jobDescription) {
				showMessage(errorEl, "Please provide both target role and job description.");
				return;
			}

			const formData = new FormData();
			formData.append("resume", file);

			setButtonLoading(analyzeBtn, true, "Uploading...");

			const uploadResponse = await apiRequest("/upload-resume", "POST", formData);
			const resumeId = pickFirst(uploadResponse, ["resumeId", "id"]);

			if (!resumeId) {
				throw new Error("No resumeId returned from upload response.");
			}

			localStorage.setItem(STORAGE_KEYS.resumeId, String(resumeId));

			setButtonLoading(analyzeBtn, true, "Running AI analysis...");
			const analysisResponse = await apiRequest("/analyze", "POST", {
				resumeId,
				role,
				jobDescription,
			});

			localStorage.setItem(STORAGE_KEYS.latestResult, JSON.stringify(analysisResponse));
			window.location.href = "result.html";
		} catch (error) {
			showMessage(errorEl, error.message || "Unable to process analysis.");
		} finally {
			setButtonLoading(analyzeBtn, false);
		}
	});
}

function renderList(elementId, values, emptyText) {
	const listEl = document.getElementById(elementId);
	if (!listEl) {
		return;
	}

	listEl.innerHTML = "";
	const items = toList(values);

	if (items.length === 0) {
		const li = document.createElement("li");
		li.textContent = emptyText;
		listEl.appendChild(li);
		return;
	}

	items.forEach((item) => {
		const li = document.createElement("li");
		li.textContent = item;
		listEl.appendChild(li);
	});
}

async function resolveLatestResultForView() {
	const latestResultRaw = localStorage.getItem(STORAGE_KEYS.latestResult);

	if (latestResultRaw) {
		try {
			return JSON.parse(latestResultRaw);
		} catch (error) {
			localStorage.removeItem(STORAGE_KEYS.latestResult);
		}
	}

	const historyResponse = await apiRequest("/history", "GET");
	const historyItems = Array.isArray(historyResponse)
		? historyResponse
		: pickFirst(historyResponse, ["history", "items", "data"], []);

	if (!Array.isArray(historyItems) || historyItems.length === 0) {
		throw new Error("No analysis found. Please upload a resume first.");
	}

	const latest = historyItems[0];
	localStorage.setItem(STORAGE_KEYS.latestResult, JSON.stringify(latest));
	return latest;
}

async function initResultPage() {
	const resultPage = document.getElementById("result-page");
	if (!resultPage) {
		return;
	}

	if (!requireAuth()) {
		return;
	}

	setupLogoutButton();

	const errorEl = document.getElementById("result-error");
	const scoreValueEl = document.getElementById("match-score-value");
	const scoreProgressEl = document.getElementById("score-progress");
	const explanationEl = document.getElementById("match-explanation");
	const subtitleEl = document.getElementById("result-subtitle");

	try {
		const latestResult = await resolveLatestResultForView();
		const analysis = normalizeAnalysis(latestResult);

		const scoreRaw = pickFirst(
			analysis,
			["matchScore", "score", "match_percentage", "matchPercent"],
			0,
		);

		const scoreNumeric = Math.max(0, Math.min(100, Number(String(scoreRaw).replace("%", "")) || 0));

		const explanation = pickFirst(
			analysis,
			["matchExplanation", "explanation", "summary"],
			"No explanation provided by backend.",
		);

		const role = pickFirst(analysis, ["role", "targetRole"], "the selected role");

		scoreValueEl.textContent = `${scoreNumeric}%`;
		scoreProgressEl.style.width = `${scoreNumeric}%`;
		explanationEl.textContent = explanation;
		subtitleEl.textContent = `Backend AI analysis for ${role}.`;

		renderList(
			"skills-list",
			pickFirst(analysis, ["extractedSkills", "skills", "matchedSkills"], []),
			"No extracted skills returned.",
		);

		renderList(
			"missing-skills-list",
			pickFirst(analysis, ["missingSkills", "gaps", "skillGaps"], []),
			"No missing skills returned.",
		);

		renderList(
			"suggestions-list",
			pickFirst(analysis, ["suggestions", "recommendations", "advice"], []),
			"No suggestions returned.",
		);

		renderList(
			"improvements-list",
			pickFirst(analysis, ["improvements", "rewrittenBullets", "bulletPoints", "improvedContent"], []),
			"No resume improvements returned.",
		);
	} catch (error) {
		showMessage(errorEl, error.message || "Failed to load result.");
	}
}

document.addEventListener("DOMContentLoaded", () => {
	initAuthPage();
	initDashboardPage();
	initUploadPage();
	initResultPage();
});
