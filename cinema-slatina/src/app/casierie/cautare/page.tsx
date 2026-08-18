import { ReservationSearch } from "@/components/cashier/reservation-search";
import { PageTitle } from "@/components/staff/ui";

export default function CashierSearchPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Caută client"
        description="Verifică dacă persoana are rezervare și marcheaz-o ca adult sau minor."
      />
      <ReservationSearch />
    </div>
  );
}
