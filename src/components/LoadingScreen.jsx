import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <motion.div
        className="loading-screen__card"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <BrandLogo className="loading-screen__logo" alt="University logo" />
        </motion.div>
        <p className="eyebrow">Public Safety University</p>
        <div className="loading-screen__headline">
          <span>Dashboard, lessons, and AI feedback modules are loading.</span>
        </div>
        <div className="loading-screen__bar">
          <span />
        </div>
      </motion.div>
    </div>
  );
}

export default LoadingScreen;
