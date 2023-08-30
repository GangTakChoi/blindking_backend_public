exports.setHeader = (req, res, next) => {
  // res.header("Access-Control-Allow-Origin", `${process.env.ORIGIN_URL}`)
  res.header("Access-Control-Allow-Origin", `http://localhost:8080`);
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Content-Security-Policy,Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
};
