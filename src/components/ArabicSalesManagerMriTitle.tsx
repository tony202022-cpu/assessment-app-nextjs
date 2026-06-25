type ArabicSalesManagerMriTitleProps = {
  text: string;
};

export default function ArabicSalesManagerMriTitle({
  text,
}: ArabicSalesManagerMriTitleProps) {
  return (
    <span
      dir="rtl"
      style={{
        display: "inline-flex",
        flexDirection: "row",
        direction: "rtl",
        alignItems: "baseline",
        gap: "0.38em",
        maxWidth: "100%",
      }}
    >
      <span>{text}</span>
      <span
        dir="ltr"
        style={{
          direction: "ltr",
          unicodeBidi: "isolate",
          whiteSpace: "nowrap",
          display: "inline-block",
        }}
      >
        (MRI)
      </span>
    </span>
  );
}
