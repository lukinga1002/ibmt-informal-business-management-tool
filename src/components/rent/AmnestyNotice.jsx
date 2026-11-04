import Notice from '@/components/ibmt/Notice';

/**
 * Amnesty notice — built, deliberately never rendered.
 *
 * Only TRA can grant an amnesty. This component is not mounted anywhere until
 * that grant is confirmed in writing; see src/config/r3.js.
 */
export default function AmnestyNotice() {
  return (
    <Notice tone="caution" title="Hakuna msamaha wa kodi kwa sasa · No amnesty in force">
      <p>
        Hakuna msamaha wa malimbikizo uliotolewa kwa mtaa huu. Usajili hapa haufuti deni lolote la kodi wala
        adhabu yoyote.
      </p>
      <p className="mt-2">
        No waiver of arrears applies here. Registering does not cancel any tax debt or penalty.
      </p>
    </Notice>
  );
}