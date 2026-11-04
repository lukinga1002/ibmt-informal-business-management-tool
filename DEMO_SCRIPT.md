# DEMO SCRIPT — 7 minutes, for a DC or RC meeting

**Before you start.** Sign in on two devices if you can: one as the platform admin (the council and DC screens, and the simulation), one as a landlord. Have one registered unit that is already verified, so the lease and rent beats do not wait on approval. Every figure below comes from the app; nothing is typed in.

Say once, at the beginning: **"Everything you will see is a demonstration register. Stages 2 and 3 are a simulation — no money moves."**

---

## 0:00 — 0:45 · The problem / Tatizo

**Screen:** `/` (Landing), then `/rent`

**English**
> "Today a district knows how many shops it has, but not how many rental rooms. Rent is paid in cash, so there is no record, no receipt, and no way to prove anything when there is a dispute. And when the council wants to value buildings for property rates, it has no register to work from.
> This is a register of rental housing: buildings, units, tenancies, rent records, and licensed agents. Not a bank. It holds no money."

**Kiswahili**
> "Leo hii wilaya inajua ina maduka mangapi, lakini haijui ina vyumba vingapi vya kupangisha. Kodi hulipwa taslimu, hivyo hakuna kumbukumbu, hakuna risiti, na hakuna ushahidi mgogoro ukitokea. Na halmashauri inapotaka kuthamini majengo kwa kodi ya majengo, haina rejista ya kuanzia.
> Hii ni rejista ya nyumba za kupangisha: majengo, vyumba, mikataba, kumbukumbu za kodi, na mawakala wenye leseni. Si benki. Haishikilii fedha."

---

## 0:45 — 1:45 · A landlord registers a unit / Mmiliki anasajili nyumba

**Screen:** `/rent/landlord/register`

**English**
> "The landlord enters the building, the ward and the mtaa, the rent, and the TANESCO meter. The address stays inside the register: it is never shown publicly. Then two separate consents — one for sharing with the council, one for listing the unit. He can withdraw either one without touching the other.
> The evidence he uploads is stored privately, and he gets a registration reference. Nothing is verified yet."

**Kiswahili**
> "Mmiliki anaingiza jengo, kata na mtaa, kodi, na namba ya mita ya TANESCO. Anwani inabaki ndani ya rejista: haionyeshwi hadharani. Kisha idhini mbili tofauti — moja ya kushiriki na halmashauri, moja ya kutangaza kitengo. Anaweza kuondoa moja bila kuathiri nyingine.
> Ushahidi anaoupakia huhifadhiwa kwa faragha, na anapata namba ya usajili. Hakuna kilichothibitishwa bado."

---

## 1:45 — 2:30 · The Mtaa officer verifies / Afisa wa Mtaa anathibitisha

**Screen:** `/rent/ward/verification`

**English**
> "The unit appears in the queue for its own ward only — an officer in Kinondoni cannot see Mwananyamala's neighbours in another ward. He opens the evidence, he approves or refuses, and a certificate is issued with a QR code.
> Read the certificate aloud: *'Usajili huu si uthibitisho wa umiliki'* — this registration is not proof of ownership. It records a unit; it does not decide who owns the land."

**Kiswahili**
> "Kitengo kinaonekana kwenye foleni ya kata yake pekee — afisa wa Kinondoni hawezi kuona vitengo vya kata nyingine. Anafungua ushahidi, anaidhinisha au anakataa, na cheti hutolewa chenye msimbo wa QR.
> Soma cheti kwa sauti: *'Usajili huu si uthibitisho wa umiliki.'* Kinasajili kitengo; hakiaamui nani anamiliki ardhi."

---

## 2:30 — 3:15 · The lease is signed / Mkataba unasainiwa

**Screen:** `/rent/landlord/lease/new` → `/rent/lease/:leaseId`

**English**
> "The landlord creates the lease from the standard template, with the rent and the dates. The tenant claims it with a one-time code from their own phone, reads it, and signs with an OTP. The landlord signs with an OTP. **The tenancy becomes active only when both have signed** — before that it is a draft, and a draft is not a tenancy.
> Notice the lease carries its template version, so a later change of wording never rewrites a lease that was already signed."

**Kiswahili**
> "Mmiliki anaunda mkataba kutoka kiolezo cha kawaida, akiweka kodi na tarehe. Mpangaji anaugawa kwa namba ya mara moja kutoka simu yake, anausoma, na anasaini kwa OTP. Mmiliki anasaini kwa OTP. **Upangaji huanza tu pale wote wawili wameandika sahihi** — kabla ya hapo ni rasimu, na rasimu si upangaji.
> Angalia mkataba unabeba toleo la kiolezo, hivyo mabadiliko ya maneno baadaye hayabadilishi mkataba uliosainiwa."

---

## 3:15 — 4:15 · Rent recorded and receipt issued / Kodi inaandikwa na risiti hutolewa

**Screen:** `/rent/tenant/pay` → `/rent/landlord/money`

**English**
> "The tenant records what he paid: rent and, on the first payment only, the deposit. The screen says what it must say: *Ada ya mpangaji: TZS 0* — the tenant pays no fee, ever.
> The record waits as **pending** until the other party confirms it. When the landlord confirms, a receipt reference is issued at that moment, and not before. If the landlord disputes it instead, there is no receipt, and the dispute is on the record with its reason.
> Look at the deposit line: it says who is holding the money — landlord, tenant or agent. This register never holds it."

**Kiswahili**
> "Mpangaji anaandika alicholipa: kodi na, kwenye malipo ya kwanza pekee, amana. Skrini inasema inachopaswa kusema: *Ada ya mpangaji: TZS 0* — mpangaji halipi ada, kamwe.
> Kumbukumbu inasubiri kama **inasubiri uthibitisho** hadi upande mwingine uithibitishe. Mmiliki anapothibitisha, namba ya risiti hutolewa wakati huo, na si kabla. Akipinga badala yake, hakuna risiti, na mgogoro unaingia kwenye kumbukumbu pamoja na sababu.
> Angalia mstari wa amana: inasema nani anashikilia fedha — mmiliki, mpangaji au wakala. Rejista hii haishikilii."

---

## 4:15 — 4:45 · A tenant checks an agent / Mpangaji anathibitisha wakala

**Screen:** `/verify`

**English**
> "Thirty seconds, from a phone, without an account. The tenant types the licence number the agent gave him. The answer is the agent's name, the council that licensed him, and whether that licence is active, suspended or revoked. No rent history, no landlord's tenant list — an agent never sees those."

**Kiswahili**
> "Sekunde thelathini, kutoka simuni, bila akaunti. Mpangaji anaingiza namba ya leseni aliyopewa na wakala. Jibu ni jina la wakala, halmashauri iliyompa leseni, na kama leseni ni hai, imesimamishwa au imefutwa. Hakuna historia ya kodi, hakuna orodha ya wapangaji wa mmiliki — wakala haoni hizo."

---

## 4:45 — 5:30 · The council's building register / Rejista ya majengo ya halmashauri

**Screen:** `/rent/council`

**English**
> "This is the screen the council actually asked for. Registered units by ward, and verified against pending. Anything describing fewer than five units is suppressed — it shows the word, not a number, so nobody can be identified from a small cell.
> Then the building register: owner, building, meter numbers, and against each row **the basis** — a by-law in force, or the owner's consent. A row with no basis shows the building and the ward only. That distinction is what keeps this lawful.
> The export is aggregate-only, it is logged before the file exists, and the log names who exported it and why."

**Kiswahili**
> "Hii ni skrini halmashauri iliiomba. Vitengo vilivyosajiliwa kwa kata, na vilivyothibitishwa dhidi ya vinavyosubiri. Kitu chochote kinachohusu vitengo chini ya tano hufichwa — kinaonyesha neno, si namba, ili mtu asitambulike kutokana na seli ndogo.
> Kisha rejista ya majengo: mmiliki, jengo, namba za mita, na kwa kila mstari **msingi** — sheria ndogo inayotumika, au idhini ya mmiliki. Mstari usio na msingi unaonyesha jengo na kata pekee. Tofauti hii ndiyo inaifanya iwe halali.
> Uhamishaji ni wa jumla pekee, huandikwa kwenye kumbukumbu kabla faili kuundwa, na kumbukumbu inataja nani aliihamisha na kwa nini."

---

## 5:30 — 6:15 · The DC dashboard / Dashibodi ya DC

**Screen:** `/rent/district` (then `/rent/region` for an RC)

**English**
> "The DC sees one district: registered units against the estimated stock, the verification rate by ward, active leases, disputes opened and resolved, licensed agents. The estimate always names its source, because an estimate without a source is not a figure.
> A district with nothing registered does not show a zero that looks like a collapse — it says 'not started'. And every cell under five units is suppressed here too.
> Everything on this screen is a count. There is no tenant's name, no phone number, no individual rent anywhere on it."

**Kiswahili**
> "DC anaona wilaya moja: vitengo vilivyosajiliwa dhidi ya makadirio ya stock, kiwango cha uthibitisho kwa kata, mikataba inayoendelea, migogoro iliyofunguliwa na kutatuliwa, mawakala wenye leseni. Makadirio hutaja chanzo chake kila wakati, kwa sababu makadirio yasiyo na chanzo si takwimu.
> Wilaya isiyo na chochote iliyosajiliwa haionyeshi sifuri inayofanana na anguko — inasema 'bado haijaanza'. Na kila seli chini ya vitengo vitano imefichwa hapa pia.
> Kila kitu kwenye skrini hii ni hesabu. Hakuna jina la mpangaji, hakuna namba ya simu, hakuna kodi ya mtu mmoja."

---

## 6:15 — 7:00 · Stages 2 and 3, as simulation / Hatua 2 na 3, kwa majaribio

**Screen:** `/rent/sim`

**English**
> "Now the part that is not switched on. This is a simulation — the partner is a mock, no money moves, and I will say that again at the end.
> Three million shillings for six months: tax three hundred thousand, agent five hundred thousand, our service fee thirty thousand, and **two million one hundred and seventy thousand to the landlord**. The order is fixed: tax, agent, fee, landlord. Every remainder from rounding goes to the landlord, never to us.
> The same payment as a renewal: no agent commission — zero — and the landlord receives two million six hundred and seventy thousand.
> Now I make the mock partner report success. Watch the ledger: it posts a balanced group — debits equal credits — and it writes nothing at all until the payment has succeeded. Then I replay the same provider reference: refused, and it lands in the alert queue for a person to look at.
> A refund cannot exceed what was paid, and it cannot be approved by the person who asked for it. Two people, always.
> And the code below the payout screen goes to the **old** number, then the change waits out its cooling-off period. Nobody can redirect a landlord's money in one step."

**Kiswahili**
> "Sasa sehemu ambayo haijawashwa. Hii ni simulation — mshirika ni wa kubuni, hakuna fedha zinazohamia, na nitarudia hilo mwishoni.
> Milioni tatu kwa miezi sita: kodi laki tatu, wakala laki tano, ada yetu elfu thelathini, na **milioni mbili na laki moja na sabini elfu kwa mmiliki**. Mpangilio haubadiliki: kodi, wakala, ada, mmiliki. Salio lolote la kuzungusha huenda kwa mmiliki, kamwe si kwetu.
> Malipo hayo hayo kama upya: hakuna kamisheni ya wakala — sifuri — na mmiliki anapata milioni mbili na laki sita na sabini elfu.
> Sasa nafanya mshirika wa kubuni atume taarifa ya mafanikio. Angalia daftari: linaandika kundi lenye usawa — debit zinalingana na krediti — na haliandiki chochote hadi malipo yafanikiwe. Kisha narudia namba hiyo hiyo ya mtoa huduma: imekataliwa, na imeingia kwenye foleni ya tahadhari ili mtu aiangalie.
> Marejesho hayawezi kuzidi kilicholipwa, na hayakaidhinishwa na aliyeyaomba. Watu wawili, kila wakati.
> Na namba iliyo chini ya skrini ya malipo inatumwa kwa namba ya **zamani**, kisha mabadiliko yanasubiri kipindi cha utulio. Hakuna anayeweza kubadili namba ya malipo ya mmiliki kwa hatua moja."

---

## Say this before you sit down / Sema hivi kabla ya kuketi

**English**
> "The arithmetic, the ledger and the controls are ready. What is not ready is the part a bank insists on: this platform cannot yet run a transaction across several records, cannot enforce a unique reference at the database, and cannot lock a record. We work around it with one-record claims and an alert queue, and that is good enough for a register — it is not good enough for other people's money. So no real money is taken on this app until that is fixed and independently tested. Stages 2 and 3 remain a simulation."

**Kiswahili**
> "Hesabu, daftari na udhibiti viko tayari. Kisichokuwa tayari ni kile benki inasisitiza: mfumo huu bado hauwezi kufanya muamala mmoja kwenye kumbukumbu kadhaa, hauwezi kulazimisha namba ya kipekee kwenye hifadhidata, na hauwezi kufunga kumbukumbu. Tunazunguka kwa kudai kumbukumbu moja moja na foleni ya tahadhari, na hiyo inatosha kwa rejista — haitoshi kwa fedha za watu wengine. Hivyo hakuna fedha halisi zitakazopokelewa kwenye mfumo huu hadi hilo lirekebishwe na kujaribiwa na watu huru. Hatua 2 na 3 zinabaki kuwa majaribio."

---

## If someone asks the hard question / Mtu akiuliza swali gumu

- **"Who can see my rent?"** You, the other party to your tenancy, and no one else. An agent sees the tenancy they are mandated for, never the rent history. The council sees counts, not your rent. / "Nani anaweza kuona kodi yangu?" Wewe, upande mwingine wa mkataba wako, na hakuna mwingine. Wakala huona upangaji alioudhinishwa, kamwe si historia ya kodi. Halmashauri huona hesabu, si kodi yako.
- **"What if the landlord lies?"** Every record needs the other party's confirmation before it produces a receipt, and a dispute is recorded with its reason and its timeline. / "Mmiliki akisema uongo?" Kila kumbukumbu inahitaji uthibitisho wa upande mwingine kabla ya kutoa risiti, na mgogoro huandikwa pamoja na sababu na mfululizo wake.
- **"Does this prove who owns the land?"** No. Registration records a unit; it is not a title. / "Hii inathibitisha nani anamiliki ardhi?" Hapana. Usajili huandika kitengo; si hati ya umiliki.
- **"Can we force landlords to register?"** The by-law is recorded on the council, and the mode can be set to voluntary, a registration window, or compulsory. But it does nothing until a by-law exists and an official proposes it. / "Tunaweza kulazimisha wamiliki kusajili?" Sheria ndogo imeandikwa kwenye halmashauri, na hali inaweza kuwekwa hiari, kipindi cha usajili, au lazima. Lakini haifanyi kazi hadi sheria ndogo iwepo na afisa aiombe.