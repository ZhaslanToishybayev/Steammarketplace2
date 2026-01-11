// Steam Login Button Fix
document.addEventListener("DOMContentLoaded", function() {
    // Fix header button
    const headerButton = document.querySelector("header button");
    if (headerButton) {
        headerButton.style.cursor = "pointer";
        headerButton.addEventListener("click", function() {
            window.location.href = "/api/auth/steam";
        });
    }

    // Fix main page button
    const mainButtons = document.querySelectorAll("button");
    mainButtons.forEach(function(btn) {
        if (btn.textContent && btn.textContent.includes("Login with Steam")) {
            btn.style.cursor = "pointer";
            btn.addEventListener("click", function() {
                window.location.href = "/api/auth/steam";
            });
        }
    });
});
