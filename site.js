(async () => {
  "use strict";

  const config = window.KARARADESK_CONFIG || {};
  const applicationId = String(config.applicationId || "").trim();
  const permissions = String(config.installPermissions || "0").trim();
  const supportServerId = String(config.supportServerId || "").trim();
  const ownerId = String(config.ownerDiscordUserId || "").trim();
  const configuredInvite = String(config.supportServerInviteUrl || "").trim();

  const installUrl = applicationId
    ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(applicationId)}&permissions=${encodeURIComponent(permissions)}&integration_type=0&scope=bot%20applications.commands`
    : "#";

  const isInviteUrl = (value) =>
    /^https:\/\/(?:www\.)?(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)[A-Za-z0-9-]+\/?$/i.test(value);

  const serverFallback = supportServerId
    ? `https://discord.com/channels/${encodeURIComponent(supportServerId)}`
    : "https://discord.com/app";
  const ownerFallback = ownerId
    ? `https://discord.com/users/${encodeURIComponent(ownerId)}`
    : "https://discord.com/app";

  let supportUrl = isInviteUrl(configuredInvite) ? configuredInvite : "";

  if (!supportUrl && supportServerId) {
    try {
      const response = await fetch(`https://discord.com/api/guilds/${encodeURIComponent(supportServerId)}/widget.json`, {
        headers: { Accept: "application/json" }
      });
      if (response.ok) {
        const widget = await response.json();
        if (isInviteUrl(String(widget.instant_invite || ""))) {
          supportUrl = widget.instant_invite;
        }
      }
    } catch {
      // The direct server URL remains the fallback for existing members.
    }
  }

  const hasPublicInvite = Boolean(supportUrl);
  supportUrl ||= serverFallback;

  document.querySelectorAll(".js-discord-install").forEach((link) => {
    link.href = installUrl;
  });

  const billingApiBase = String(
    config.billingApiBaseUrl || config.enterpriseApiBaseUrl || ""
  ).replace(/\/$/, "");
  const billingApiPrefix = String(
    config.billingApiPathPrefix || "/api/billing"
  ).replace(/\/$/, "");

  document.querySelectorAll("[data-billing-plan]").forEach((link) => {
    const plan = String(link.dataset.billingPlan || "").trim().toLowerCase();

    if (billingApiBase && (plan === "pro" || plan === "business")) {
      link.href = `${billingApiBase}${billingApiPrefix}/checkout/start?plan=${encodeURIComponent(plan)}`;
      link.removeAttribute("target");
      link.removeAttribute("rel");
      return;
    }

    link.href = "#pricing";
    link.setAttribute("aria-disabled", "true");
  });

  const billingFeedback = document.querySelector("[data-billing-feedback]");
  if (billingFeedback) {
    const pageUrl = new URL(window.location.href);
    const billingError = pageUrl.searchParams.get("billing_error");
    const checkoutSuccess = pageUrl.searchParams.get("checkout") === "success";
    const selectedPlan = String(pageUrl.searchParams.get("plan") || "").trim();
    const title = billingFeedback.querySelector("[data-billing-feedback-title]");
    const message = billingFeedback.querySelector("[data-billing-feedback-message]");

    if (billingError) {
      billingFeedback.hidden = false;
      billingFeedback.dataset.state = "error";
      if (title) title.textContent = "Checkout could not continue";
      if (message) message.textContent = billingError;
    } else if (checkoutSuccess) {
      billingFeedback.hidden = false;
      billingFeedback.dataset.state = "success";
      if (title) title.textContent = "Payment completed";
      if (message) {
        const planLabel = selectedPlan
          ? `${selectedPlan.charAt(0).toUpperCase()}${selectedPlan.slice(1)} `
          : "";
        message.textContent = `Your ${planLabel}subscription is being synchronized with the selected Discord server. This normally finishes within a few seconds.`;
      }
    }
  }

  document.querySelectorAll(".js-support-server").forEach((link) => {
    link.href = supportUrl;
    if (!hasPublicInvite) {
      link.dataset.invitePending = "true";
      if (link.dataset.pendingLabel) link.textContent = link.dataset.pendingLabel;
    }
  });

  document.querySelectorAll(".js-sales-contact").forEach((link) => {
    link.href = hasPublicInvite ? supportUrl : ownerFallback;
  });

  document.querySelectorAll("[data-support-invite-status]").forEach((element) => {
    element.textContent = hasPublicInvite
      ? "Permanent support-server invite connected."
      : "The support server is live. Add its permanent invite in site-config.js, or enable the Discord Server Widget.";
    element.classList.toggle("is-ready", hasPublicInvite);
  });

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const portal = document.querySelector("[data-enterprise-portal]");
  if (!portal) return;

  const apiBase = String(config.enterpriseApiBaseUrl || "").replace(/\/$/, "");
  const apiPrefix = String(config.enterpriseApiPathPrefix || "/api/enterprise").replace(/\/$/, "");
  const sessionKey = "kararadesk.enterprise.session.v1";
  const pollIntervalMs = 5000;

  const statusTitle = portal.querySelector("[data-enterprise-status-title]");
  const statusMessage = portal.querySelector("[data-enterprise-status-message]");
  const statusBox = portal.querySelector("[data-enterprise-status]");
  const authActions = portal.querySelector("[data-enterprise-auth-actions]");
  const loginLink = portal.querySelector("[data-enterprise-login]");
  const otherAccountLink = portal.querySelector("[data-enterprise-login-other]");
  const userCard = portal.querySelector("[data-enterprise-user]");
  const avatar = portal.querySelector("[data-enterprise-avatar]");
  const username = portal.querySelector("[data-enterprise-username]");
  const logoutButton = portal.querySelector("[data-enterprise-logout]");
  const switchAccountButton = portal.querySelector("[data-enterprise-switch-account]");
  const screeningCard = portal.querySelector("[data-enterprise-screening]");
  const checkingLabel = portal.querySelector("[data-enterprise-checking]");
  const formShell = portal.querySelector("[data-enterprise-form-shell]");
  const form = portal.querySelector("[data-enterprise-form]");
  const submitButton = portal.querySelector("[data-enterprise-submit]");
  const formError = portal.querySelector("[data-enterprise-error]");
  const openedCard = portal.querySelector("[data-enterprise-opened]");
  const ticketNumber = portal.querySelector("[data-enterprise-ticket-number]");
  const ticketLink = portal.querySelector("[data-enterprise-ticket-link]");

  let session = null;
  let profile = null;
  let pollTimer = null;

  function setStatus(title, message, state = "default") {
    if (statusTitle) statusTitle.textContent = title;
    if (statusMessage) statusMessage.textContent = message;
    if (statusBox) statusBox.dataset.state = state;
  }

  function showError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.hidden = !message;
  }

  function hideAllWorkflowPanels() {
    if (screeningCard) screeningCard.hidden = true;
    if (formShell) formShell.hidden = true;
    if (openedCard) openedCard.hidden = true;
  }

  function readStoredSession() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
      if (!parsed?.token || !parsed?.expiresAt) return null;
      if (Date.parse(parsed.expiresAt) <= Date.now()) {
        sessionStorage.removeItem(sessionKey);
        return null;
      }
      return parsed;
    } catch {
      sessionStorage.removeItem(sessionKey);
      return null;
    }
  }

  function storeSession(payload) {
    const stored = {
      token: payload.sessionToken,
      expiresAt: payload.expiresAt,
      user: payload.user || null,
      legal: payload.legal || null
    };
    sessionStorage.setItem(sessionKey, JSON.stringify(stored));
    return stored;
  }

  function clearSession() {
    sessionStorage.removeItem(sessionKey);
    session = null;
    profile = null;
    if (pollTimer) window.clearTimeout(pollTimer);
    pollTimer = null;
  }

  async function apiRequest(path, options = {}) {
    if (!apiBase) {
      throw new Error("The Enterprise API is not configured yet.");
    }

    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`);
    }

    const response = await fetch(`${apiBase}${apiPrefix}${path}`, {
      ...options,
      headers
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(payload?.error || "The Enterprise service could not complete the request.");
      error.code = payload?.code || "REQUEST_FAILED";
      error.status = response.status;
      error.supportServerUrl = payload?.supportServerUrl || supportUrl;
      throw error;
    }

    return payload;
  }

  function cleanOAuthQuery() {
    const url = new URL(window.location.href);
    url.searchParams.delete("oauth_code");
    url.searchParams.delete("enterprise_error");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function formatExistingTicketNumber(ticket) {
    if (!ticket) return "";
    if (ticket.number) return String(ticket.number);
    const raw = ticket.ticketNumber ?? ticket.ticketId;
    return raw ? `ENT-${String(raw).padStart(4, "0")}` : "Enterprise";
  }

  function showOpenedTicket(ticket, shouldRedirect = false) {
    hideAllWorkflowPanels();
    if (openedCard) openedCard.hidden = false;
    if (authActions) authActions.hidden = true;

    const number = formatExistingTicketNumber(ticket);
    if (ticketNumber) ticketNumber.textContent = `${number} is ready.`;
    if (ticketLink) ticketLink.href = ticket.channelUrl;

    setStatus("OPENED TICKET", "Your private Enterprise Discord ticket is ready.", "success");

    if (submitButton) {
      submitButton.textContent = "OPENED TICKET";
      submitButton.disabled = true;
    }

    if (shouldRedirect && ticket.channelUrl) {
      window.setTimeout(() => {
        window.location.assign(ticket.channelUrl);
      }, 1400);
    }
  }

  function showSignedInUser(user) {
    if (!userCard) return;
    userCard.hidden = false;
    if (username) username.textContent = user?.username || "Discord user";
    if (avatar) {
      avatar.src = user?.avatarUrl || "assets/kararadesk-logo.svg";
    }
    if (form?.elements?.email && user?.email && !form.elements.email.value) {
      form.elements.email.value = user.email;
    }
  }

  function scheduleMembershipCheck() {
    if (pollTimer) window.clearTimeout(pollTimer);
    pollTimer = window.setTimeout(async () => {
      if (document.hidden) {
        scheduleMembershipCheck();
        return;
      }
      try {
        await loadCurrentUser();
      } catch {
        scheduleMembershipCheck();
      }
    }, pollIntervalMs);
  }

  function renderProfile(data) {
    profile = data;
    showSignedInUser(data.user);
    if (authActions) authActions.hidden = true;

    if (data.ticket?.channelUrl) {
      showOpenedTicket(data.ticket, false);
      return;
    }

    if (!data.membership?.joined || !data.membership?.screeningComplete) {
      hideAllWorkflowPanels();
      if (screeningCard) screeningCard.hidden = false;
      if (checkingLabel) checkingLabel.textContent = "Checking membership status every 5 seconds…";
      setStatus(
        "Accept the Discord server rules",
        "Your account joined the support server. Complete Membership Screening before opening the ticket.",
        "warning"
      );
      scheduleMembershipCheck();
      return;
    }

    if (pollTimer) window.clearTimeout(pollTimer);
    pollTimer = null;
    hideAllWorkflowPanels();
    if (formShell) formShell.hidden = false;
    setStatus("Ready to open your ticket", "Membership Screening is complete. Submit the form to create your private channel.", "success");
  }

  async function loadCurrentUser() {
    try {
      const data = await apiRequest("/me", { method: "GET" });
      renderProfile(data);
      return data;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        renderLoggedOut("Your Discord session expired. Sign in again.");
        return null;
      }
      setStatus("Enterprise service unavailable", error.message, "error");
      showError(error.message);
      throw error;
    }
  }

  function renderLoggedOut(message = "KararaDesk will request permission to identify your account and add it to the official support server.") {
    hideAllWorkflowPanels();
    if (authActions) authActions.hidden = false;
    if (userCard) userCard.hidden = true;
    if (username) username.textContent = "Discord user";
    if (avatar) avatar.src = "assets/kararadesk-logo.svg";
    if (logoutButton) logoutButton.disabled = false;
    if (switchAccountButton) switchAccountButton.disabled = false;
    setStatus("Connect Discord to continue", message, "default");
  }

  async function exchangeOAuthCode(code) {
    setStatus("Completing Discord sign-in", "Please wait while KararaDesk verifies your account.", "loading");
    const payload = await apiRequest("/session/exchange", {
      method: "POST",
      body: JSON.stringify({ code })
    });
    session = storeSession(payload);
    cleanOAuthQuery();
    await loadCurrentUser();
  }

  function buildLoginUrl({ switchAccount = false } = {}) {
    if (!apiBase) return "#";
    const returnUrl = `${window.location.origin}${window.location.pathname}`;
    const url = new URL(`${apiBase}${apiPrefix}/oauth/start`);
    url.searchParams.set("return_to", returnUrl);
    if (switchAccount) {
      url.searchParams.set("switch_account", "1");
      url.searchParams.set("fresh", String(Date.now()));
    }
    return url.toString();
  }

  function configureLoginLinks() {
    if (loginLink) loginLink.href = buildLoginUrl();
    if (otherAccountLink) otherAccountLink.href = buildLoginUrl({ switchAccount: true });
  }

  configureLoginLinks();

  function revokeSessionToken(token) {
    if (!token || !apiBase) return;
    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    });

    // keepalive allows the revocation request to finish even when account
    // switching immediately navigates the browser to Discord.
    void fetch(`${apiBase}${apiPrefix}/session/logout`, {
      method: "POST",
      headers,
      keepalive: true
    }).catch(() => null);
  }

  function signOut({ switchAccount = false } = {}) {
    const previousToken = session?.token || "";

    if (logoutButton) logoutButton.disabled = true;
    if (switchAccountButton) switchAccountButton.disabled = true;

    // Update the page immediately. A slow network must never leave stale
    // account controls visible after the user has chosen to sign out.
    clearSession();
    form?.reset();
    showError("");
    renderLoggedOut(
      switchAccount
        ? "Signed out. On Discord, choose ‘Not you?’ to continue with another account."
        : "You have signed out of KararaDesk. Choose an account to continue."
    );

    revokeSessionToken(previousToken);

    if (switchAccount) {
      window.location.assign(buildLoginUrl({ switchAccount: true }));
    }
  }

  otherAccountLink?.addEventListener("click", (event) => {
    event.preventDefault();
    clearSession();
    window.location.assign(buildLoginUrl({ switchAccount: true }));
  });

  portal.addEventListener("click", (event) => {
    const logoutTarget = event.target.closest("[data-enterprise-logout]");
    const switchTarget = event.target.closest("[data-enterprise-switch-account]");

    if (!logoutTarget && !switchTarget) return;

    event.preventDefault();
    event.stopPropagation();

    signOut({ switchAccount: Boolean(switchTarget) });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");

    if (!form.reportValidity()) return;
    if (!session?.token || !profile?.membership?.screeningComplete) {
      showError("Sign in with Discord and accept the server rules before opening a ticket.");
      return;
    }

    const legal = profile.legal || session.legal || {};
    const data = new FormData(form);
    const legalAccepted = Boolean(form.elements.legalConsent?.checked);

    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      organization: String(data.get("organization") || "").trim(),
      members: String(data.get("members") || "").trim(),
      servers: String(data.get("servers") || "").trim(),
      requirements: String(data.get("requirements") || "").trim(),
      website: String(data.get("website") || "").trim(),
      termsAccepted: legalAccepted,
      privacyAccepted: legalAccepted,
      termsVersion: legal.termsVersion || config.termsVersion,
      privacyVersion: legal.privacyVersion || config.privacyVersion
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "OPENING TICKET…";
    }
    setStatus("Opening your private ticket", "KararaDesk is creating the Discord channel and permissions.", "loading");

    try {
      const result = await apiRequest("/tickets", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showOpenedTicket(result.ticket, true);
    } catch (error) {
      showError(error.message);
      setStatus("Ticket was not opened", error.message, "error");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Open Enterprise Ticket";
      }
      if (error.code === "SCREENING_REQUIRED") {
        await loadCurrentUser().catch(() => null);
      }
    }
  });

  const currentUrl = new URL(window.location.href);
  const oauthCode = currentUrl.searchParams.get("oauth_code");
  const oauthError = currentUrl.searchParams.get("enterprise_error");

  if (oauthError) {
    cleanOAuthQuery();
    renderLoggedOut(oauthError);
    showError(oauthError);
    return;
  }

  if (oauthCode) {
    try {
      await exchangeOAuthCode(oauthCode);
    } catch (error) {
      clearSession();
      cleanOAuthQuery();
      renderLoggedOut(error.message);
      showError(error.message);
    }
    return;
  }

  session = readStoredSession();
  if (session) {
    await loadCurrentUser().catch(() => null);
  } else {
    renderLoggedOut();
  }
})();
