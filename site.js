(async () => {
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

  // When no invite is hard-coded, Discord's public server widget can supply one.
  // This works after Server Settings → Widget is enabled with an invite channel.
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
      // The direct Discord server URL below remains a safe fallback for existing members.
    }
  }

  const hasPublicInvite = Boolean(supportUrl);
  supportUrl ||= serverFallback;

  document.querySelectorAll(".js-discord-install").forEach((link) => {
    link.href = installUrl;
  });

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
      : "The support server is live. Add its permanent invite in site-config.js, or enable the Discord Server Widget to publish the Join link automatically.";
    element.classList.toggle("is-ready", hasPublicInvite);
  });

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const leadForm = document.querySelector("[data-enterprise-form]");
  if (!leadForm) return;

  const output = document.querySelector("[data-enterprise-output]");
  const copyButton = document.querySelector("[data-copy-enterprise]");
  const discordButton = document.querySelector("[data-enterprise-discord]");

  const buildMessage = () => {
    const data = new FormData(leadForm);
    const clean = (value) => String(value || "").trim() || "Not provided";
    return [
      "KararaDesk Enterprise enquiry",
      "",
      `Name: ${clean(data.get("name"))}`,
      `Work email: ${clean(data.get("email"))}`,
      `Company / community: ${clean(data.get("organization"))}`,
      `Discord server members: ${clean(data.get("members"))}`,
      `Number of servers: ${clean(data.get("servers"))}`,
      `Main requirements: ${clean(data.get("requirements"))}`
    ].join("\n");
  };

  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = buildMessage();
    if (output) {
      output.value = message;
      output.hidden = false;
    }
    if (copyButton) copyButton.hidden = false;
    if (discordButton) {
      discordButton.hidden = false;
      discordButton.href = hasPublicInvite ? supportUrl : ownerFallback;
      discordButton.textContent = hasPublicInvite ? "Open Discord Sales" : "Contact Owner on Discord";
    }
    try {
      await navigator.clipboard.writeText(message);
      if (copyButton) copyButton.textContent = "Copied — open Discord";
    } catch {
      if (copyButton) copyButton.textContent = "Copy enquiry";
    }
  });

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const message = output?.value || buildMessage();
      try {
        await navigator.clipboard.writeText(message);
        copyButton.textContent = "Copied";
      } catch {
        output?.select();
      }
    });
  }
})();
