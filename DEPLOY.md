# Deploy the KararaDesk website with GitHub Pages

This is a complete static website. No `npm install` or build step is required.

## 1. Discord support-server invite

The permanent KararaDesk support-server invite is already configured in `site-config.js`:

```js
supportServerInviteUrl: "https://discord.gg/UKCZvMCy7N",
```

The same value automatically powers every **Support Server** and **Enterprise Sales** Discord button across the website. The application ID, support-server ID, owner Discord user ID, and bot-install permissions are also configured.

## 2. Publish with GitHub Pages

1. Replace the current files in the `kararadesk-site` repository with this folder's contents.
2. Commit and push the changes to the default branch.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the default branch and `/ (root)`, then save.
6. Wait for GitHub Pages to publish the update.

## Included improvements

- Branded KararaDesk bot icon and favicon.
- Updated Discord install URL using guild installation context.
- Official Support Server buttons in the header, hero, support banner, FAQ, CTA, and footer.
- Dedicated Support Server page.
- Dedicated Enterprise Sales page with a structured enquiry builder.
- Enterprise no longer directs visitors to GitHub.
- Centralized Discord URLs in `site-config.js`.
- Updated legal-page contact wording.
- Mobile-responsive layout and social metadata.

## Developer Portal setting required for Add App

The website's **Add KararaDesk** buttons are configured. For the button on the bot's Discord profile to work too, set the application in Discord Developer Portal to:

- Installation Context: **Guild Install enabled**
- Install Link: **Discord Provided Link**
- Scopes: `bot`, `applications.commands`
- Public Bot: **enabled**
- Requires OAuth2 Code Grant: **disabled**

## Important

- Do not publish Discord bot tokens, Lemon Squeezy keys, webhook secrets, passwords, or private keys in this repository.
- Legal pages are a practical starting point, not a substitute for professional legal review.
