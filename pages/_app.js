import { Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export default function App({ Component, pageProps }) {
  return (
    <div className={`${display.variable} font-sans`}>
      <Component {...pageProps} />
    </div>
  );
}
