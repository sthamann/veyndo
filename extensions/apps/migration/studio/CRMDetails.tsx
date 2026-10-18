/** Original addresses and historical positions stay visible before the merchant approves native intake. */
import { useCRMText } from "./crm-i18n";
import { rowAmount, type SourceRecord, type SourceAddress } from "./model";
function Address({ value }: { value?: SourceAddress | null }) {
  if (!value) return null;
  return (
    <address className="migration-address">
      {value.name}
      <br />
      {value.company && (
        <>
          {value.company}
          <br />
        </>
      )}
      {value.street}
      <br />
      {value.additionalAddressLine1 && (
        <>
          {value.additionalAddressLine1}
          <br />
        </>
      )}
      {value.postalCode} {value.city}
      <br />
      {value.country} {value.countryStateId}
    </address>
  );
}
export default function CRMDetails({ row }: { row: SourceRecord }) {
  const t = useCRMText();
  const d = row.data;
  return (
    <div className="migration-source-detail">
      <dl>
        {d.email && (
          <>
            <dt>{t("email")}</dt>
            <dd>{d.email}</dd>
          </>
        )}
        {d.createdAt && (
          <>
            <dt>{t("date")}</dt>
            <dd>
              <time dateTime={d.createdAt}>{d.createdAt}</time>
            </dd>
          </>
        )}
        {d.sourcePaymentStatus !== undefined &&
          d.sourcePaymentStatus !== null && (
            <>
              <dt>{t("payment")}</dt>
              <dd>{String(d.sourcePaymentStatus)}</dd>
            </>
          )}
        {d.sourceOrderStatus !== undefined && d.sourceOrderStatus !== null && (
          <>
            <dt>{t("order")}</dt>
            <dd>{String(d.sourceOrderStatus)}</dd>
          </>
        )}
        {d.billingAddress && (
          <>
            <dt>{t("billing")}</dt>
            <dd>
              <Address value={d.billingAddress} />
            </dd>
          </>
        )}
        {d.shippingAddress && (
          <>
            <dt>{t("shipping")}</dt>
            <dd>
              <Address value={d.shippingAddress} />
            </dd>
          </>
        )}
      </dl>
      {!!d.additionalAddresses?.length && (
        <details>
          <summary>
            {t("additional")} · {d.additionalAddresses.length}
          </summary>
          {d.additionalAddresses.map((value, index) => (
            <Address key={index} value={value} />
          ))}
        </details>
      )}
      {!!d.lines?.length && (
        <details>
          <summary>
            {t("lines")} · {d.lines.length}
          </summary>
          <ul>
            {d.lines.map((line, index) => (
              <li key={line.sourceId ?? index}>
                {line.quantity} × {line.label}
                {line.unitPrice && (
                  <>
                    {" "}
                    ·{" "}
                    {rowAmount({
                      ...row,
                      kind: "products",
                      data: { price: line.unitPrice },
                    })}
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="migration-intake-notice">{t("notice")}</p>
    </div>
  );
}
