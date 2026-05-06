function BrandLogo({ className = "", alt = "Brand logo" }) {
  const classes = ["brand-logo", className].filter(Boolean).join(" ");

  return <img src="/brand-logo.png" alt={alt} className={classes} />;
}

export default BrandLogo;
