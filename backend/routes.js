const express = require("express");
const router = express.Router();
const { runOCR } = require("./core/ocr");
const analyze = require("./core/analyze");

router.post("/check", async (req, res) => {

  try {

    let text = req.body.text || "";

    if (req.body.imageBase64) {

      const ocr = await runOCR(req.body.imageBase64);

      if (ocr.success) text = ocr.text;

    }

    const result = analyze(text);

    res.json({ data: result });

  } catch (err) {

    res.json({
      data: {
        band: "SUSPICIOUS",
        score: 50,
        reasons: ["OCR could not reliably extract text."]
      }
    });

  }

});

module.exports = router;