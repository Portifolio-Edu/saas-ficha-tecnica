import { ProteinasDemo } from "../PorPapelDemo";
import { proteinas, processamentos } from "../fixtures";

export default function Page() {
  // PROTEÍNAS (2026-09-25): lê também os lotes registrados no tablet da demo.
  return <ProteinasDemo proteinas={proteinas} processamentos={processamentos} />;
}
