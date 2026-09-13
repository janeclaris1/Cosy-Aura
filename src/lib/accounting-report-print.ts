const PRINT_STYLES = ["/financial-report.css", "/accounting-report-print.css"];

/** Print a DOM subtree in an isolated iframe (admin chrome is excluded). */
export function printAccountingReport(root: HTMLElement) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const printWin = iframe.contentWindow;
  if (!doc || !printWin) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cosy Aura — Accounting report</title></head><body></body></html>`
  );
  doc.close();

  for (const href of PRINT_STYLES) {
    doc.head.appendChild(
      Object.assign(document.createElement("link"), {
        rel: "stylesheet",
        href,
      })
    );
  }

  document.querySelectorAll("style").forEach((node) => {
    doc.head.appendChild(node.cloneNode(true));
  });

  const clone = root.cloneNode(true) as HTMLElement;
  clone.classList.add("accounting-report-print-document");

  clone.querySelectorAll(".print\\:hidden").forEach((el) => {
    el.remove();
  });


  doc.body.appendChild(clone);
  doc.body.className = "accounting-report-print-body";

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  printWin.addEventListener("afterprint", cleanup, { once: true });

  const runPrint = () => {
    printWin.focus();
    printWin.print();
    window.setTimeout(cleanup, 2000);
  };

  // Allow cloned stylesheets to apply before opening the dialog.
  window.setTimeout(runPrint, 400);
}
