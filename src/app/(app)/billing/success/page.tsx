import { BillingSuccessClient } from './BillingSuccessClient'

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return (
    <BillingSuccessClient
      paymentKey={getParam(params.paymentKey)}
      orderId={getParam(params.orderId)}
      amount={getParam(params.amount)}
    />
  )
}
