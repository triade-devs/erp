"use client";

export function usePrint(formId: "pre-avaliacao" | "ficha-anestesia") {
  const print = () => {
    const bodyClass = `printing-${formId}`;
    const cleanup = () => {
      document.body.classList.remove(bodyClass);
      window.removeEventListener("afterprint", cleanup);
    };

    document.body.classList.add(bodyClass);
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  return { print };
}
