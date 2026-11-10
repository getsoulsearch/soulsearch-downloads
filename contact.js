// Contact / bug report form. Sends through Web3Forms (a free form-to-email service), so the site needs no server and
// the owner's email address never appears on the page. The form's key lives in contact.json ("access_key");
// until it is filled in, the form stays hidden and the page says it isn't switched on.
(async () => {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const off = document.getElementById("contact-off");
  const status = form.querySelector(".contact-status");
  let cfg = {};
  try { cfg = await (await fetch("contact.json", { cache: "no-cache" })).json(); } catch (e) { /* stays off */ }
  if (!cfg.access_key) { off.hidden = false; return; }
  form.hidden = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.botcheck) return;                                   // a bot filled the hidden field
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    status.textContent = "Sending...";
    const lines = [data.message, "", `System: ${data.system || "-"}`, `App version: ${data.version || "-"}`];
    try {
      const reply = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: cfg.access_key,
          subject: `SoulSearch: ${data.topic}`,
          from_name: "SoulSearch website",
          email: data.email || undefined,                        // lets the owner reply straight from the mail
          message: lines.join("\n"),
        }),
      });
      const out = await reply.json();
      if (!out.success) throw new Error(out.message || "It didn't go through.");
      form.reset();
      status.textContent = "Sent. Thank you!";
    } catch (err) {
      status.textContent = "That didn't send (" + err.message + "). Try again in a minute.";
    } finally {
      button.disabled = false;
    }
  });
})();
