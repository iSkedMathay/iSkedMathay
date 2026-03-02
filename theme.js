// theme.js

function applyTheme(theme) {
  const themes = {
    default: {
      "--main-bg": "#f7f3ef",
      "--sidebar-bg": "#f2e9df",
      "--text-color": "#000",
      "--accent1": "#ff5f6d",
      "--accent2": "#d82cff",
      "--card-bg": "#ffffff"
    },
    light: {
      "--main-bg": "#faf6f2",
      "--sidebar-bg": "#f0e6db",
      "--text-color": "#333",
      "--accent1": "#ff8960",
      "--accent2": "#d17f4a",
      "--card-bg": "#ffffff"
    },
    dark: {
      "--main-bg": "#1e1b2e",
      "--sidebar-bg": "#2d2740",
      "--text-color": "#f3eaff",
      "--accent1": "#a855f7",
      "--accent2": "#ec4899",
      "--card-bg": "#2f2a3d"
    },
    blue: {
      "--main-bg": "#e7f3ff",
      "--sidebar-bg": "#d6e6f5",
      "--text-color": "#1c2c3c",
      "--accent1": "#3da9fc",
      "--accent2": "#0077b6",
      "--card-bg": "#ffffff"
    },
    green: {
      "--main-bg": "#e8f5e9",
      "--sidebar-bg": "#c8e6c9",
      "--text-color": "#1b5e20",
      "--accent1": "#43a047",
      "--accent2": "#2e7d32",
      "--card-bg": "#ffffff"
    },
    purple: {
      "--main-bg": "#f3e5f5",
      "--sidebar-bg": "#e1bee7",
      "--text-color": "#4a148c",
      "--accent1": "#9c27b0",
      "--accent2": "#7b1fa2",
      "--card-bg": "#ffffff"
    },
    brown: {
      "--main-bg": "#efebe9",
      "--sidebar-bg": "#d7ccc8",
      "--text-color": "#3e2723",
      "--accent1": "#8d6e63",
      "--accent2": "#5d4037",
      "--card-bg": "#ffffff"
    },
    peach: {
      "--main-bg": "#ffe5d4",
      "--sidebar-bg": "#ffd0b0",
      "--text-color": "#4e342e",
      "--accent1": "#ff7043",
      "--accent2": "#ff8a65",
      "--card-bg": "#ffffff"
    }
  };

  const selected = themes[theme] || themes.default;
  for (const key in selected) {
    document.documentElement.style.setProperty(key, selected[key]);
  }
  localStorage.setItem("selectedTheme", theme);
}

// ✅ Load saved theme on every page load
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("selectedTheme") || "default";
  applyTheme(savedTheme);

  // ✅ Auto change when selecting new theme (for settings.html)
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener("change", (e) => {
      const chosen = e.target.value;
      applyTheme(chosen);
    });
  }
});
