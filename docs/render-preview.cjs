const fs = require("fs");
(async () => {
  const { pdf } = await import("pdf-to-img");
  const converter = await pdf(fs.readFileSync("preview/Unitec-Familia-Services.pdf"));
  let i = 1;
  for await (const page of converter) {
    fs.writeFileSync(`preview/slide-${String(i).padStart(2, "0")}.png`, page);
    i++;
  }
  console.log("rendered", i - 1, "pages");
})();
