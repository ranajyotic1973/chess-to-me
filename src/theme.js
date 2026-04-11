import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1f1f72"
    },
    secondary: {
      main: "#f97316"
    },
    background: {
      default: "#f4f4f6",
      paper: "#ffffff"
    }
  },
  typography: {
    fontFamily: '"Manrope Variable", "Manrope", "Segoe UI", Tahoma, sans-serif',
    button: {
      textTransform: "none"
    }
  },
  shape: {
    borderRadius: 14
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          padding: "1rem"
        }
      }
    }
  }
});

export default theme;
