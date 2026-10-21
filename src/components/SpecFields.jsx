import { Field } from "./Modal.jsx";

// Size / speed / paper inputs that follow the machine type:
//   paper_cup: cup size range (oz | ml) + max height, speed range (cups per min | hr | day), paper GSM range + PE coating
//   tissue:    tissue size range (mm | cm), speed range (tissues per min | hr | day), optional paper GSM range
//   other:     speed range only
// Every range has a Min and a Max. The server checks the same rules and derives the text shown in the apps.
export const isSized = (type) => type === "paper_cup" || type === "tissue";
const noun = (type) =>
  type === "paper_cup" ? "cups" : type === "tissue" ? "tissues" : "units";

const Range = ({
  label,
  hint,
  nameMin,
  nameMax,
  min,
  max,
  step = 1,
  required,
  spec,
  unitName,
  units,
  unitDefault,
}) => (
  <Field label={label}>
    <div className="rangerow">
      <input
        name={nameMin}
        type="number"
        inputMode="decimal"
        placeholder="Min"
        min={min}
        max={max}
        step={step}
        required={required}
        defaultValue={spec?.[0] ?? ""}
        aria-label={`${label} minimum`}
      />
      <span className="dash">–</span>
      <input
        name={nameMax}
        type="number"
        inputMode="decimal"
        placeholder="Max"
        min={min}
        max={max}
        step={step}
        required={required}
        defaultValue={spec?.[1] ?? ""}
        aria-label={`${label} maximum`}
      />
      {units && (
        <select
          name={unitName}
          defaultValue={unitDefault ?? units[0][0]}
          aria-label={`${label} unit`}
        >
          {units.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
      )}
    </div>
    {hint && <small className="hint">{hint}</small>}
  </Field>
);

export default function SpecFields({ type, spec }) {
  const sized = isSized(type);
  const cup = type === "paper_cup";
  const sizeUnits = cup
    ? [
        ["oz", "oz"],
        ["ml", "ml"],
      ]
    : [
        ["cm", "cm"],
        ["mm", "mm"],
      ];
  const sizeLimits = cup
    ? { min: 0.5, max: 100, step: 0.5 }
    : { min: 0.5, max: 5000, step: 0.5 };
  return (
    <div key={type}>
      {sized && (
        <Range
          label={cup ? "Cup size" : "Tissue size"}
          hint={
            cup
              ? "Smallest to largest cup the machine makes"
              : "Smallest to largest tissue the machine makes"
          }
          nameMin="sizeMin"
          nameMax="sizeMax"
          spec={[spec?.size?.min, spec?.size?.max]}
          {...sizeLimits}
          required
          unitName="sizeUnit"
          units={sizeUnits}
          unitDefault={spec?.size?.unit}
        />
      )}
      {cup && (
        <Field label="Max cup height (mm), optional">
          <input
            name="maxHeightMm"
            type="number"
            min="10"
            max="1000"
            step="1"
            placeholder="e.g. 137"
            defaultValue={spec?.maxHeightMm ?? ""}
          />
        </Field>
      )}
      <Range
        label={`Production speed (${noun(type)})`}
        hint={`How many ${noun(type)} it makes, from the slowest to the fastest setting`}
        nameMin="speedMin"
        nameMax="speedMax"
        spec={[spec?.speed?.min, spec?.speed?.max]}
        min={1}
        max={10000000}
        step={1}
        required={sized}
        unitName="speedPer"
        units={[
          ["min", `per minute`],
          ["hr", "per hour"],
          ["day", "per day"],
        ]}
        unitDefault={spec?.speed?.per}
      />
      {sized && (
        <>
          <Range
            label={`Paper weight (GSM)${cup ? "" : ", optional"}`}
            nameMin="gsmMin"
            nameMax="gsmMax"
            spec={[spec?.gsm?.min, spec?.gsm?.max]}
            min={10}
            max={1000}
            step={1}
          />
          {cup && (
            <Field label="Paper coating">
              <select name="coatingType" defaultValue={spec?.coating ?? ""}>
                <option value="">Not specified</option>
                <option value="single">Single PE coated</option>
                <option value="double">Double PE coated</option>
                <option value="either">Single or double PE coated</option>
                <option value="none">Uncoated</option>
              </select>
            </Field>
          )}
        </>
      )}
    </div>
  );
}

/** Same rules as the server, so mistakes are caught before sending. Returns an error message or ''. */
export function checkSpec(f, type) {
  const pair = (label, a, b, { whole = false } = {}) => {
    const [x, y] = [f[a], f[b]].map((v) =>
      v === "" || v == null ? null : Number(v),
    );
    if (x == null && y == null) return "";
    if (x == null || y == null)
      return `${label}: enter both the minimum and the maximum`;
    if (whole && (!Number.isInteger(x) || !Number.isInteger(y)))
      return `${label}: use whole numbers`;
    if (x > y) return `${label}: the minimum cannot be more than the maximum`;
    return "";
  };
  const cup = type === "paper_cup";
  return (
    (isSized(type) &&
      pair(cup ? "Cup size" : "Tissue size", "sizeMin", "sizeMax")) ||
    pair("Production speed", "speedMin", "speedMax", { whole: true }) ||
    pair("Paper GSM", "gsmMin", "gsmMax") ||
    ""
  );
}
