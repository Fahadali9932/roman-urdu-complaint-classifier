import {
  calculateComplaintPriority,
  getPriorityQueueCounts,
} from '../src/lib/priority-engine.ts';

const EVAL_NOW = new Date('2026-11-15T18:00:00Z');

/**
 * 180-case comprehensive independent evaluation dataset across all six departments.
 * Includes realistic Roman Urdu variants, negation patterns, colloquial vocabulary,
 * aging variations, and completed workflows.
 */
const CHALLENGE_DATASET = [
  // ============================================================================
  // 1. KMC — Municipal Infrastructure (30 Cases)
  // ============================================================================
  { id: 'KMC-01', dept: 'kmc', description: 'Main Shahrah-e-Faisal par bohot gehra crater hai aur road baith gayi hai hadsa ho chuka hai.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'KMC-02', dept: 'kmc', description: 'Khula gutter road ke beech me hai dhakkan gayab hai bacha girte girte bacha.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'KMC-03', dept: 'kmc', description: 'Pedestrian bridge ka loha toot gaya hai aur kabhi bhi gir sakta hai log darr rahe hain.', expectedQueue: 'urgent', hoursAgo: 5, status: 'assigned' },
  { id: 'KMC-04', dept: 'kmc', description: 'University Road par manhole khula hai andhere me motorcyclist gir chuka hai severe accident risk.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'KMC-05', dept: 'kmc', description: 'Storm water drain ki deewar toot ke road par gir gayi hai traffic block aur collapse hazard.', expectedQueue: 'urgent', hoursAgo: 6, status: 'assigned' },
  { id: 'KMC-06', dept: 'kmc', description: 'Flyover ke expansion joint me gehra shigaf par gaya hai gaariyan phans rahi hain collapse danger.', expectedQueue: 'urgent', hoursAgo: 4, status: 'assigned' },
  { id: 'KMC-07', dept: 'kmc', description: 'Underpass me barish ke pani ke sath road zameen me dhas gayi hai bohot khatarnak.', expectedQueue: 'urgent', hoursAgo: 8, status: 'assigned' },
  { id: 'KMC-08', dept: 'kmc', description: 'School ke samne khula manhole hai bache roz guzar te hain emergency hadsa ho sakta hai.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'KMC-09', dept: 'kmc', description: 'Gutter ka dhakkan khula nahi hai bas thoda loose hai check karein.', expectedQueue: 'routine', hoursAgo: 10, status: 'assigned' },
  { id: 'KMC-10', dept: 'kmc', description: 'Road par koi hadsa nahi hua bas thodi si patching ki zaroorat hai.', expectedQueue: 'routine', hoursAgo: 14, status: 'assigned' },
  { id: 'KMC-11', dept: 'kmc', description: 'Crater nahi hai sadak par normal bumps hain gaari ahista chalani parti hai.', expectedQueue: 'routine', hoursAgo: 20, status: 'assigned' },
  { id: 'KMC-12', dept: 'kmc', description: 'Sadak tooti hui nahi hai bas footpath par thoda paint hona hai.', expectedQueue: 'routine', hoursAgo: 24, status: 'assigned' },
  { id: 'KMC-13', dept: 'kmc', description: 'Bridge collapse ka koi masla nahi hai bas railing safai chahiye.', expectedQueue: 'routine', hoursAgo: 30, status: 'assigned' },
  { id: 'KMC-14', dept: 'kmc', description: 'Dhakkan gayab nahi hai theek laga hua hai bas level karna hai.', expectedQueue: 'routine', hoursAgo: 18, status: 'assigned' },
  { id: 'KMC-15', dept: 'kmc', description: 'Galli me chota sa gaddha hai jahan pani jama hota hai repair kar dein.', expectedQueue: 'routine', hoursAgo: 8, status: 'assigned' },
  { id: 'KMC-16', dept: 'kmc', description: 'Street light ka pole tedha hai lekin girne ka khatra nahi hai sirf fixing.', expectedQueue: 'routine', hoursAgo: 12, status: 'assigned' },
  { id: 'KMC-17', dept: 'kmc', description: 'Kerb stones thode toote hue hain footpath theek karwayen.', expectedQueue: 'routine', hoursAgo: 16, status: 'assigned' },
  { id: 'KMC-18', dept: 'kmc', description: 'Speed breaker ka paint utar gaya hai naya laga dein.', expectedQueue: 'routine', hoursAgo: 22, status: 'assigned' },
  { id: 'KMC-19', dept: 'kmc', description: 'Service road par mitti jama hai safai ki appeal.', expectedQueue: 'routine', hoursAgo: 26, status: 'assigned' },
  { id: 'KMC-20', dept: 'kmc', description: 'Choti mor par sign board lagana chahiye traffic ke liye.', expectedQueue: 'routine', hoursAgo: 32, status: 'assigned' },
  { id: 'KMC-21', dept: 'kmc', description: 'Footpath par paver blocks ukhre hue hain repair kar dein 4 din se unaddressed.', expectedQueue: 'overdue', hoursAgo: 96, status: 'assigned' },
  { id: 'KMC-22', dept: 'kmc', description: 'Choti sadak ki repaving ki application di thi 5 din ho gaye koi team nahi aai.', expectedQueue: 'overdue', hoursAgo: 120, status: 'assigned' },
  { id: 'KMC-23', dept: 'kmc', description: 'Street light repair complaint filed 80 hours ago still pending.', expectedQueue: 'overdue', hoursAgo: 80, status: 'assigned' },
  { id: 'KMC-24', dept: 'kmc', description: 'Colony gate ke bahar road cut dala tha pipe ke liye abhi tak band nahi kiya 4 din se.', expectedQueue: 'overdue', hoursAgo: 100, status: 'assigned' },
  { id: 'KMC-25', dept: 'kmc', description: 'Old footpath repair completed successfully and inspected.', expectedQueue: 'routine', hoursAgo: 110, status: 'resolved' },
  { id: 'KMC-26', dept: 'kmc', description: 'Gaddha bhar diya gaya hai verification ho chuki hai.', expectedQueue: 'routine', hoursAgo: 150, status: 'resolved' },
  { id: 'KMC-27', dept: 'kmc', description: 'Road issue', expectedQueue: 'needs_assessment', hoursAgo: 4, status: 'assigned', lowConfidence: true },
  { id: 'KMC-28', dept: 'kmc', description: 'Kuch masla hai hamari gali me jaldi check karein.', expectedQueue: 'needs_assessment', hoursAgo: 6, status: 'assigned', lowConfidence: true },
  { id: 'KMC-29', dept: 'kmc', description: 'Expressway interchange par barrier crash ke baad toota hua latak raha hai.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'KMC-30', dept: 'kmc', description: 'Main boulevard par road 5 foot gehra zameen me dhans chuki hai gas pipe ke upar.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },

  // ============================================================================
  // 2. KWSC — Water & Sewerage (30 Cases)
  // ============================================================================
  { id: 'KWSC-01', dept: 'kwsc', description: 'Gutter ka ganda pani ghar ke andar dakhil ho raha hai bache beemar par rahe hain emergency.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'KWSC-02', dept: 'kwsc', description: 'Ghar me 5 din se peene ka pani nahi aa raha na tanker mil raha hai shadeed bohran.', expectedQueue: 'urgent', hoursAgo: 120, status: 'assigned' },
  { id: 'KWSC-03', dept: 'kwsc', description: 'Main drinking water pipeline phat gayi hai aur lakhoon gallon pani zaya aur road doob gaya.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'KWSC-04', dept: 'kwsc', description: 'Sewerage line choke hone ki wajah se poora hospital ward gande pani se bhar gaya hai infection risk.', expectedQueue: 'urgent', hoursAgo: 4, status: 'assigned' },
  { id: 'KWSC-05', dept: 'kwsc', description: 'Sehat ke liye khatarnak: gutter ka pani underground drinking tank me leak kar raha hai.', expectedQueue: 'urgent', hoursAgo: 5, status: 'assigned' },
  { id: 'KWSC-06', dept: 'kwsc', description: 'Main road par sewage overflow 3 din se hai aur chalna namumkin hai beemari phail rahi hai.', expectedQueue: 'urgent', hoursAgo: 72, status: 'assigned' },
  { id: 'KWSC-07', dept: 'kwsc', description: 'Mohallay me char din se paani ki shadeed qillat hai peene ko boond nahi.', expectedQueue: 'urgent', hoursAgo: 96, status: 'assigned' },
  { id: 'KWSC-08', dept: 'kwsc', description: 'Pani ki main line burst ho kar transformer ke paas dharra ban gayi hai.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'KWSC-09', dept: 'kwsc', description: 'Pani nahi aa raha subah se lekin tanker mangwa liya hai masla nahi.', expectedQueue: 'routine', hoursAgo: 6, status: 'assigned' },
  { id: 'KWSC-10', dept: 'kwsc', description: 'Gutter ubal nahi raha bas thoda sa smell aa rahi hai safai kar dein.', expectedQueue: 'routine', hoursAgo: 12, status: 'assigned' },
  { id: 'KWSC-11', dept: 'kwsc', description: 'Line leak nahi hai sirf valve par thodi nami hai check kar lein.', expectedQueue: 'routine', hoursAgo: 15, status: 'assigned' },
  { id: 'KWSC-12', dept: 'kwsc', description: 'Water pressure kam hai motor chalani parti hai standard supply.', expectedQueue: 'routine', hoursAgo: 20, status: 'assigned' },
  { id: 'KWSC-13', dept: 'kwsc', description: 'Ghar ke bahar drain pipe theek hai bas nali safai mangti hai.', expectedQueue: 'routine', hoursAgo: 24, status: 'assigned' },
  { id: 'KWSC-14', dept: 'kwsc', description: 'Water bill me reading zyada aayi hai meter check karwana hai.', expectedQueue: 'routine', hoursAgo: 30, status: 'assigned' },
  { id: 'KWSC-15', dept: 'kwsc', description: 'Gali me halka sa pani ruka hua hai nali saaf karein.', expectedQueue: 'routine', hoursAgo: 8, status: 'assigned' },
  { id: 'KWSC-16', dept: 'kwsc', description: 'Pipeline par connection lagwane ke liye application status chahiye.', expectedQueue: 'routine', hoursAgo: 14, status: 'assigned' },
  { id: 'KWSC-17', dept: 'kwsc', description: 'Water supply schedule maloom karna hai is hafte ka.', expectedQueue: 'routine', hoursAgo: 18, status: 'assigned' },
  { id: 'KWSC-18', dept: 'kwsc', description: 'Sewerage line me mitti phans gayi hai routine de-silting ki zaroorat.', expectedQueue: 'routine', hoursAgo: 22, status: 'assigned' },
  { id: 'KWSC-19', dept: 'kwsc', description: 'Valve operator time par valve nahi kholta shikayat.', expectedQueue: 'routine', hoursAgo: 28, status: 'assigned' },
  { id: 'KWSC-20', dept: 'kwsc', description: 'Tanker service request for regular domestic filling.', expectedQueue: 'routine', hoursAgo: 32, status: 'assigned' },
  { id: 'KWSC-21', dept: 'kwsc', description: 'Choti line me se halka pani leak ho raha hai 4 din se request pending.', expectedQueue: 'overdue', hoursAgo: 98, status: 'assigned' },
  { id: 'KWSC-22', dept: 'kwsc', description: 'Low pressure complaint logged 85 hours ago no inspection done.', expectedQueue: 'overdue', hoursAgo: 85, status: 'assigned' },
  { id: 'KWSC-23', dept: 'kwsc', description: 'Sewer manhole de-silting pending for 5 days.', expectedQueue: 'overdue', hoursAgo: 120, status: 'assigned' },
  { id: 'KWSC-24', dept: 'kwsc', description: 'Water meter testing request unresolved for 90 hours.', expectedQueue: 'overdue', hoursAgo: 90, status: 'assigned' },
  { id: 'KWSC-25', dept: 'kwsc', description: 'Sewage line unblocked and repaired yesterday by staff team.', expectedQueue: 'routine', hoursAgo: 110, status: 'resolved' },
  { id: 'KWSC-26', dept: 'kwsc', description: 'New water line connection installed and water flowing.', expectedQueue: 'routine', hoursAgo: 130, status: 'resolved' },
  { id: 'KWSC-27', dept: 'kwsc', description: 'Pani masla', expectedQueue: 'needs_assessment', hoursAgo: 4, status: 'assigned', lowConfidence: true },
  { id: 'KWSC-28', dept: 'kwsc', description: 'Line theek karo jaldi', expectedQueue: 'needs_assessment', hoursAgo: 6, status: 'assigned', lowConfidence: true },
  { id: 'KWSC-29', dept: 'kwsc', description: 'Gutter overflow se maternity clinic ke bahar rasta band ho gaya hai bohot badboo.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'KWSC-30', dept: 'kwsc', description: 'Poore sector me 6 din se peene ka pani band hai bache dehydrated.', expectedQueue: 'urgent', hoursAgo: 144, status: 'assigned' },

  // ============================================================================
  // 3. K-Electric — Power & Electricity (30 Cases)
  // ============================================================================
  { id: 'KE-01', dept: 'kelectric', description: 'Khula bijli ka taar toota hua zameen par gira hai current aa raha hai log bhag rahe hain.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'KE-02', dept: 'kelectric', description: 'PMT transformer me aag lag gayi hai dhamake ho rahe hain spark phail raha hai.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'KE-03', dept: 'kelectric', description: '5 din se bijli nahi aa rahi shadeed garmi me mareez behaal hain prolonged blackout.', expectedQueue: 'urgent', hoursAgo: 120, status: 'assigned' },
  { id: 'KE-04', dept: 'kelectric', description: 'Street pole se nanga wire latak raha hai bacho ke school ke gate par short circuit.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'KE-05', dept: 'kelectric', description: 'High voltage current deewar me aa raha hai ghar ke andar switch board jal gaya.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'KE-06', dept: 'kelectric', description: 'Barish ke pani me khamba khara hai aur paani me current dhor raha hai emergency.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'KE-07', dept: 'kelectric', description: 'Mohallay me 4 din se lagatar light band hai phase ura hua hai.', expectedQueue: 'urgent', hoursAgo: 96, status: 'assigned' },
  { id: 'KE-08', dept: 'kelectric', description: 'Overhead cable se aag ke shole gir rahe hain dukanon ke upar.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'KE-09', dept: 'kelectric', description: 'Bijli nahi aa rahi subah 2 ghante se loadshedding schedule ke mutabiq.', expectedQueue: 'routine', hoursAgo: 3, status: 'assigned' },
  { id: 'KE-10', dept: 'kelectric', description: 'Taar toota nahi hai bas thoda jhool raha hai pole par fixing kar dein.', expectedQueue: 'routine', hoursAgo: 10, status: 'assigned' },
  { id: 'KE-11', dept: 'kelectric', description: 'Current nahi aa raha khambe me bas light chali gayi hai.', expectedQueue: 'routine', hoursAgo: 12, status: 'assigned' },
  { id: 'KE-12', dept: 'kelectric', description: 'Transformer me koi aag nahi lagi sirf oil change ka waqt hai.', expectedQueue: 'routine', hoursAgo: 16, status: 'assigned' },
  { id: 'KE-13', dept: 'kelectric', description: 'Digital meter reading check karwani hai bill zyada aaya hai.', expectedQueue: 'routine', hoursAgo: 20, status: 'assigned' },
  { id: 'KE-14', dept: 'kelectric', description: 'Voltage thode kam hain AC nahi uth raha fan chal raha hai.', expectedQueue: 'routine', hoursAgo: 24, status: 'assigned' },
  { id: 'KE-15', dept: 'kelectric', description: 'New meter connection lagwane ki application inquiry.', expectedQueue: 'routine', hoursAgo: 8, status: 'assigned' },
  { id: 'KE-16', dept: 'kelectric', description: 'Street light din me bhi jalti rehti hai switch laga dein.', expectedQueue: 'routine', hoursAgo: 14, status: 'assigned' },
  { id: 'KE-17', dept: 'kelectric', description: 'Tree branches wire ko touch kar rahi hain pruning chahiye.', expectedQueue: 'routine', hoursAgo: 18, status: 'assigned' },
  { id: 'KE-18', dept: 'kelectric', description: 'Meter box ka dhakkan toota hua hai naya box lagayen.', expectedQueue: 'routine', hoursAgo: 22, status: 'assigned' },
  { id: 'KE-19', dept: 'kelectric', description: 'Bill payment duplicate copy chahiye online nahi mil rahi.', expectedQueue: 'routine', hoursAgo: 26, status: 'assigned' },
  { id: 'KE-20', dept: 'kelectric', description: 'Single phase fluctuate ho raha hai normal maintenance.', expectedQueue: 'routine', hoursAgo: 30, status: 'assigned' },
  { id: 'KE-21', dept: 'kelectric', description: 'Low voltage complaint pending for 80 hours.', expectedQueue: 'overdue', hoursAgo: 80, status: 'assigned' },
  { id: 'KE-22', dept: 'kelectric', description: 'Meter relocation request unaddressed for 4 days.', expectedQueue: 'overdue', hoursAgo: 100, status: 'assigned' },
  { id: 'KE-23', dept: 'kelectric', description: 'Street light bulb replacement unresolved for 96 hours.', expectedQueue: 'overdue', hoursAgo: 96, status: 'assigned' },
  { id: 'KE-24', dept: 'kelectric', description: 'Faulty billing assessment complaint pending for 110 hours.', expectedQueue: 'overdue', hoursAgo: 110, status: 'assigned' },
  { id: 'KE-25', dept: 'kelectric', description: 'Fallen line replaced and power restored yesterday.', expectedQueue: 'routine', hoursAgo: 95, status: 'resolved' },
  { id: 'KE-26', dept: 'kelectric', description: 'Transformer repair completed successfully.', expectedQueue: 'routine', hoursAgo: 120, status: 'resolved' },
  { id: 'KE-27', dept: 'kelectric', description: 'Bijli complaint', expectedQueue: 'needs_assessment', hoursAgo: 4, status: 'assigned', lowConfidence: true },
  { id: 'KE-28', dept: 'kelectric', description: 'Light issue help', expectedQueue: 'needs_assessment', hoursAgo: 5, status: 'assigned', lowConfidence: true },
  { id: 'KE-29', dept: 'kelectric', description: 'Transformer se tail leak ho raha hai aur tez dhuan nikal raha hai emergency.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'KE-30', dept: 'kelectric', description: 'Khula wire market ke pathway par gira hua hai log darr ke maray dukan band kar rahe hain.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },

  // ============================================================================
  // 4. SSGC — Gas Transmission & Supply (30 Cases)
  // ============================================================================
  { id: 'SSGC-01', dept: 'ssgc', description: 'Apartment building ki line se tez gas leak ho rahi hai bohot shadeed badboo aag lagne ka khatra.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'SSGC-02', dept: 'ssgc', description: 'Main gas line phat gayi hai sadak par se awaaz aa rahi hai hissing sound emergency dispatch.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'SSGC-03', dept: 'ssgc', description: 'Ghar ke kitchen me gas pipe leak ho raha hai cylinder jaisa sound aag lag sakti hai.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'SSGC-04', dept: 'ssgc', description: 'Chulha gas leak ki wajah se poore mohallay me gas phail gayi hai log bahar nikal aye.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'SSGC-05', dept: 'ssgc', description: 'Gas pipeline me se gas ki badboo hospital ward tak ja rahi hai blast risk.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'SSGC-06', dept: 'ssgc', description: 'Poore area me 5 din se gas mutasir hai bilkul zero gas khana pakna band.', expectedQueue: 'urgent', hoursAgo: 120, status: 'assigned' },
  { id: 'SSGC-07', dept: 'ssgc', description: 'Underground gas pipeline se shigaf ho kar aag ke shole nikal rahe hain.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'SSGC-08', dept: 'ssgc', description: 'Basement me heavy gas leak detect hua hai suffocating hazard.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'SSGC-09', dept: 'ssgc', description: 'Gas nahi aa rahi subah se khana banane me dushwari lekin leak nahi hai.', expectedQueue: 'routine', hoursAgo: 4, status: 'assigned' },
  { id: 'SSGC-10', dept: 'ssgc', description: 'Gas ki badboo nahi aa rahi bas chulha halka jalta hai pressure kam hai.', expectedQueue: 'routine', hoursAgo: 8, status: 'assigned' },
  { id: 'SSGC-11', dept: 'ssgc', description: 'Line leak nahi hai sirf meter reading lene wala staff nahi aaya.', expectedQueue: 'routine', hoursAgo: 12, status: 'assigned' },
  { id: 'SSGC-12', dept: 'ssgc', description: 'Gas pressure sham ke waqt thoda low hota hai routine timings.', expectedQueue: 'routine', hoursAgo: 16, status: 'assigned' },
  { id: 'SSGC-13', dept: 'ssgc', description: 'Naya gas connection lagwane ke documents jama karwayen hain.', expectedQueue: 'routine', hoursAgo: 20, status: 'assigned' },
  { id: 'SSGC-14', dept: 'ssgc', description: 'Gas bill me surcharge lag kar aaya hai correction ki darkhwast.', expectedQueue: 'routine', hoursAgo: 24, status: 'assigned' },
  { id: 'SSGC-15', dept: 'ssgc', description: 'Chulhe ka burner saaf karwana hai servicing.', expectedQueue: 'routine', hoursAgo: 8, status: 'assigned' },
  { id: 'SSGC-16', dept: 'ssgc', description: 'Meter transfer application under name change procedure.', expectedQueue: 'routine', hoursAgo: 14, status: 'assigned' },
  { id: 'SSGC-17', dept: 'ssgc', description: 'Gas pipe par paint karne ki request maintenance.', expectedQueue: 'routine', hoursAgo: 18, status: 'assigned' },
  { id: 'SSGC-18', dept: 'ssgc', description: 'Sector me gas supply schedule ka information board mangte hain.', expectedQueue: 'routine', hoursAgo: 22, status: 'assigned' },
  { id: 'SSGC-19', dept: 'ssgc', description: 'Commercial connection inquiry for bakery.', expectedQueue: 'routine', hoursAgo: 26, status: 'assigned' },
  { id: 'SSGC-20', dept: 'ssgc', description: 'Regulator valve tight karwana hai safety survey.', expectedQueue: 'routine', hoursAgo: 30, status: 'assigned' },
  { id: 'SSGC-21', dept: 'ssgc', description: 'Low gas pressure complaint logged 80 hours ago pending inspection.', expectedQueue: 'overdue', hoursAgo: 80, status: 'assigned' },
  { id: 'SSGC-22', dept: 'ssgc', description: 'Meter replacement complaint pending for 4 days.', expectedQueue: 'overdue', hoursAgo: 96, status: 'assigned' },
  { id: 'SSGC-23', dept: 'ssgc', description: 'Billing adjustment request unaddressed for 120 hours.', expectedQueue: 'overdue', hoursAgo: 120, status: 'assigned' },
  { id: 'SSGC-24', dept: 'ssgc', description: 'Minor pipe clamp replacement pending for 5 days.', expectedQueue: 'overdue', hoursAgo: 110, status: 'assigned' },
  { id: 'SSGC-25', dept: 'ssgc', description: 'Reported leak patched and gas restored safely.', expectedQueue: 'routine', hoursAgo: 90, status: 'resolved' },
  { id: 'SSGC-26', dept: 'ssgc', description: 'Meter replaced with new digital unit.', expectedQueue: 'routine', hoursAgo: 130, status: 'resolved' },
  { id: 'SSGC-27', dept: 'ssgc', description: 'Gas masla', expectedQueue: 'needs_assessment', hoursAgo: 4, status: 'assigned', lowConfidence: true },
  { id: 'SSGC-28', dept: 'ssgc', description: 'Sui gas complaint check', expectedQueue: 'needs_assessment', hoursAgo: 5, status: 'assigned', lowConfidence: true },
  { id: 'SSGC-29', dept: 'ssgc', description: 'Main road pipeline excavate karte waqt JCB ne tod di tez gas nikal rahi hai blast risk.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'SSGC-30', dept: 'ssgc', description: 'Apartment kitchen me gas leak se chulha phatne ka khatra hai siren baj raha hai.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },

  // ============================================================================
  // 5. SBCA — Building Control Authority (30 Cases)
  // ============================================================================
  { id: 'SBCA-01', dept: 'sbca', description: 'Purani building ki chhat ka cement gir raha hai deewar me gehra crack aagaya hai kabhi bhi gir sakti hai collapse danger.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'SBCA-02', dept: 'sbca', description: 'Commercial building ka pillar crack ho gaya hai aur deewar jhuk chuki hai hadsa mutawaqqe.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'SBCA-03', dept: 'sbca', description: 'Padosi ne baghair foundation ke 6th floor khara kar diya hai building teedi ho rahi hai imminent collapse.', expectedQueue: 'urgent', hoursAgo: 4, status: 'assigned' },
  { id: 'SBCA-04', dept: 'sbca', description: 'Bachat bazaar ke boundary wall zameen par girne wali hai log neeche chalte hain.', expectedQueue: 'urgent', hoursAgo: 5, status: 'assigned' },
  { id: 'SBCA-05', dept: 'sbca', description: 'Residential flat ka balcony floor toot ke latak raha hai kabhi bhi gir sakta hai.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'SBCA-06', dept: 'sbca', description: 'Under construction plaza ka shuttering gir gayi hai aur iron rods nikal aaye hain hazard.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'SBCA-07', dept: 'sbca', description: 'Deewar girne ka shadeed khatra hai barish ki wajah se buniyaad nikal aayi hai.', expectedQueue: 'urgent', hoursAgo: 4, status: 'assigned' },
  { id: 'SBCA-08', dept: 'sbca', description: 'Illegal construction ki wajah se sath wali building ki neev baith gayi hai shigaf par gaye.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'SBCA-09', dept: 'sbca', description: 'Deewar girne ka koi khatra nahi hai sirf plaster utar gaya hai.', expectedQueue: 'routine', hoursAgo: 10, status: 'assigned' },
  { id: 'SBCA-10', dept: 'sbca', description: 'Building collapse nahi ho rahi bas paint aur safai ki zaroorat hai.', expectedQueue: 'routine', hoursAgo: 14, status: 'assigned' },
  { id: 'SBCA-11', dept: 'sbca', description: 'Crack gehra nahi hai sirf hairline crack hai inspection request.', expectedQueue: 'routine', hoursAgo: 18, status: 'assigned' },
  { id: 'SBCA-12', dept: 'sbca', description: 'Ghar ke aage thodi si encroachment hai footpath par stall laga hai.', expectedQueue: 'routine', hoursAgo: 22, status: 'assigned' },
  { id: 'SBCA-13', dept: 'sbca', description: 'Plot boundary wall verification ke documents check karwane hain.', expectedQueue: 'routine', hoursAgo: 26, status: 'assigned' },
  { id: 'SBCA-14', dept: 'sbca', description: 'Construction permit approved hai ya nahi status inquiry.', expectedQueue: 'routine', hoursAgo: 30, status: 'assigned' },
  { id: 'SBCA-15', dept: 'sbca', description: 'Sath wale plot par mitti dali hui hai level karwayen.', expectedQueue: 'routine', hoursAgo: 8, status: 'assigned' },
  { id: 'SBCA-16', dept: 'sbca', description: 'Sunshade thoda aage badha liya hai neighbour issue.', expectedQueue: 'routine', hoursAgo: 14, status: 'assigned' },
  { id: 'SBCA-17', dept: 'sbca', description: 'Completion certificate lene ke liye process maloom karna hai.', expectedQueue: 'routine', hoursAgo: 18, status: 'assigned' },
  { id: 'SBCA-18', dept: 'sbca', description: 'Window ventilation ka NOC chahiye.', expectedQueue: 'routine', hoursAgo: 24, status: 'assigned' },
  { id: 'SBCA-19', dept: 'sbca', description: 'Water tank roof par rakhne ki permission guidelines.', expectedQueue: 'routine', hoursAgo: 28, status: 'assigned' },
  { id: 'SBCA-20', dept: 'sbca', description: 'Commercial shop sign board standard dimensions.', expectedQueue: 'routine', hoursAgo: 32, status: 'assigned' },
  { id: 'SBCA-21', dept: 'sbca', description: 'Illegal construction complaint pending for 85 hours.', expectedQueue: 'overdue', hoursAgo: 85, status: 'assigned' },
  { id: 'SBCA-22', dept: 'sbca', description: 'Encroachment removal notice unserved for 4 days.', expectedQueue: 'overdue', hoursAgo: 100, status: 'assigned' },
  { id: 'SBCA-23', dept: 'sbca', description: 'Unauthorized shed inspection unresolved for 96 hours.', expectedQueue: 'overdue', hoursAgo: 96, status: 'assigned' },
  { id: 'SBCA-24', dept: 'sbca', description: 'Map violation complaint pending for 115 hours.', expectedQueue: 'overdue', hoursAgo: 115, status: 'assigned' },
  { id: 'SBCA-25', dept: 'sbca', description: 'Demolition order executed and hazardous balcony removed.', expectedQueue: 'routine', hoursAgo: 100, status: 'resolved' },
  { id: 'SBCA-26', dept: 'sbca', description: 'Building structure certified safe by structural engineer.', expectedQueue: 'routine', hoursAgo: 120, status: 'resolved' },
  { id: 'SBCA-27', dept: 'sbca', description: 'Building complaint', expectedQueue: 'needs_assessment', hoursAgo: 4, status: 'assigned', lowConfidence: true },
  { id: 'SBCA-28', dept: 'sbca', description: 'Makaan check karo', expectedQueue: 'needs_assessment', hoursAgo: 6, status: 'assigned', lowConfidence: true },
  { id: 'SBCA-29', dept: 'sbca', description: 'Commercial plaza ka beam crack ho chuka hai aur cement gir raha hai fori evacuation ki zaroorat.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'SBCA-30', dept: 'sbca', description: 'Overhead water tank ki deewar phat chuki hai aur neeche gali me girne wali hai emergency.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },

  // ============================================================================
  // 6. SSWMB — Solid Waste Management (30 Cases)
  // ============================================================================
  { id: 'SSWMB-01', dept: 'sswmb', description: 'Hospital ke samne poisonous toxic kachra aur used syringes pheki gayi hain bache khel rahe hain extreme health hazard.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'SSWMB-02', dept: 'sswmb', description: 'Chemical aur hospital waste clinic ke samne dump kar diya hai infection phailne ka khatra emergency.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'SSWMB-03', dept: 'sswmb', description: 'School ke gate ke aage aag laga di hai kachray me toxic smoke bacho ka dam ghut raha hai.', expectedQueue: 'urgent', hoursAgo: 1, status: 'assigned' },
  { id: 'SSWMB-04', dept: 'sswmb', description: 'Animal market ka sarda kachra aur carcasses road par dump hain beemari phail rahi hai fori action.', expectedQueue: 'urgent', hoursAgo: 4, status: 'assigned' },
  { id: 'SSWMB-05', dept: 'sswmb', description: 'Main drain me kachra phansne se chemical liquid street par overflow ho gaya hai toxic.', expectedQueue: 'urgent', hoursAgo: 5, status: 'assigned' },
  { id: 'SSWMB-06', dept: 'sswmb', description: 'Kachray ke dher me se poisonous gas aur shadeed aag nikal rahi hai dukanon ke paas.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'SSWMB-07', dept: 'sswmb', description: 'Maternity home ke aage biomedical waste phenka hua hai infection and disease outbreak risk.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
  { id: 'SSWMB-08', dept: 'sswmb', description: 'Poultry waste road par pheka gaya hai shadeed badboo aur flies se ilaqay me dengue ka darr.', expectedQueue: 'urgent', hoursAgo: 6, status: 'assigned' },
  { id: 'SSWMB-09', dept: 'sswmb', description: 'Kachra nahi pheka gaya bas street ki jharoo lagwani hai.', expectedQueue: 'routine', hoursAgo: 10, status: 'assigned' },
  { id: 'SSWMB-10', dept: 'sswmb', description: 'Toxic waste nahi hai bas ghar ka aam kachra dustbin me bhara hai utha lein.', expectedQueue: 'routine', hoursAgo: 12, status: 'assigned' },
  { id: 'SSWMB-11', dept: 'sswmb', description: 'Badboo nahi aa rahi bas dustbin ka dhakkan toota hua hai.', expectedQueue: 'routine', hoursAgo: 16, status: 'assigned' },
  { id: 'SSWMB-12', dept: 'sswmb', description: 'Kachray ki gari roz subah 9 baje ki bajaye 11 baje aati hai timing theek karein.', expectedQueue: 'routine', hoursAgo: 20, status: 'assigned' },
  { id: 'SSWMB-13', dept: 'sswmb', description: 'Safai theek hui hai bas gali ke konay par thode patte hain sweeping.', expectedQueue: 'routine', hoursAgo: 24, status: 'assigned' },
  { id: 'SSWMB-14', dept: 'sswmb', description: 'New community garbage bin lagwane ki darkhwast mohalla committee.', expectedQueue: 'routine', hoursAgo: 28, status: 'assigned' },
  { id: 'SSWMB-15', dept: 'sswmb', description: 'Chote park me empty wrappers pare hain safai karein.', expectedQueue: 'routine', hoursAgo: 8, status: 'assigned' },
  { id: 'SSWMB-16', dept: 'sswmb', description: 'Sanitation worker attendance inquiry for block 7.', expectedQueue: 'routine', hoursAgo: 14, status: 'assigned' },
  { id: 'SSWMB-17', dept: 'sswmb', description: 'Plastic recycling awareness campaign flyers.', expectedQueue: 'routine', hoursAgo: 18, status: 'assigned' },
  { id: 'SSWMB-18', dept: 'sswmb', description: 'Dustbin paint and numbering update.', expectedQueue: 'routine', hoursAgo: 22, status: 'assigned' },
  { id: 'SSWMB-19', dept: 'sswmb', description: 'Commercial market night shift collection schedule request.', expectedQueue: 'routine', hoursAgo: 26, status: 'assigned' },
  { id: 'SSWMB-20', dept: 'sswmb', description: 'Street bin placed incorrectly moving 10 feet ahead.', expectedQueue: 'routine', hoursAgo: 30, status: 'assigned' },
  { id: 'SSWMB-21', dept: 'sswmb', description: 'Garbage not collected for 4 days routine bin full.', expectedQueue: 'overdue', hoursAgo: 96, status: 'assigned' },
  { id: 'SSWMB-22', dept: 'sswmb', description: 'Street sweeping complaint unaddressed for 80 hours.', expectedQueue: 'overdue', hoursAgo: 80, status: 'assigned' },
  { id: 'SSWMB-23', dept: 'sswmb', description: 'Community dustbin emptying delayed for 5 days.', expectedQueue: 'overdue', hoursAgo: 120, status: 'assigned' },
  { id: 'SSWMB-24', dept: 'sswmb', description: 'Market waste container removal pending for 90 hours.', expectedQueue: 'overdue', hoursAgo: 90, status: 'assigned' },
  { id: 'SSWMB-25', dept: 'sswmb', description: 'Accumulated waste cleared and area fumigated.', expectedQueue: 'routine', hoursAgo: 110, status: 'resolved' },
  { id: 'SSWMB-26', dept: 'sswmb', description: 'Hospital front waste disposed of under biohazard protocol.', expectedQueue: 'routine', hoursAgo: 140, status: 'resolved' },
  { id: 'SSWMB-27', dept: 'sswmb', description: 'Kachra masla', expectedQueue: 'needs_assessment', hoursAgo: 4, status: 'assigned', lowConfidence: true },
  { id: 'SSWMB-28', dept: 'sswmb', description: 'Safai karo', expectedQueue: 'needs_assessment', hoursAgo: 5, status: 'assigned', lowConfidence: true },
  { id: 'SSWMB-29', dept: 'sswmb', description: 'Hospital gate par biohazard waste syringes phainki hui hain toxic.', expectedQueue: 'urgent', hoursAgo: 2, status: 'assigned' },
  { id: 'SSWMB-30', dept: 'sswmb', description: 'Dead cattle dumped near residential school stench causing children fainting.', expectedQueue: 'urgent', hoursAgo: 3, status: 'assigned' },
];

function runEvaluation() {
  console.log('==============================================================================');
  console.log('AWAAZ-E-AWAM — PHASE 3F.3 EXTENSIVE 180-CASE PRIORITY EVALUATION BENCHMARK');
  console.log(`Evaluation Timestamp: ${EVAL_NOW.toISOString()}`);
  console.log(`Total Labeled Challenge Cases: ${CHALLENGE_DATASET.length}`);
  console.log('==============================================================================\n');

  let totalUrgent = 0;
  let correctUrgent = 0;
  let falseUrgent = 0;
  let missedUrgent = 0;

  let totalOverdue = 0;
  let correctOverdue = 0;

  let totalRoutine = 0;
  let correctRoutineExclusion = 0;

  let totalNeedsAssessment = 0;
  let correctNeedsAssessment = 0;

  const deptStats = {
    kmc: { total: 0, passed: 0 },
    kwsc: { total: 0, passed: 0 },
    kelectric: { total: 0, passed: 0 },
    ssgc: { total: 0, passed: 0 },
    sbca: { total: 0, passed: 0 },
    sswmb: { total: 0, passed: 0 },
  };

  const failures = [];

  for (const item of CHALLENGE_DATASET) {
    deptStats[item.dept].total++;

    const submittedDate = new Date(EVAL_NOW.getTime() - item.hoursAgo * 60 * 60 * 1000);
    const mockComplaint = {
      id: `test-${item.id}`,
      referenceNumber: `TEST-${item.id}`,
      title: item.category || 'Test Complaint',
      description: item.description,
      status: item.status,
      assignedDepartmentId: item.dept,
      district: 'Karachi',
      locality: 'Urban Area',
      publicLocation: null,
      detectedLanguage: 'roman_urdu',
      submittedAt: submittedDate.toISOString(),
      timeline: [],
      predictionConfidence: item.lowConfidence ? 0.35 : 0.92,
      redactionNeedsReview: item.lowConfidence ? true : false,
    };

    const evaluation = calculateComplaintPriority(mockComplaint, EVAL_NOW);

    let actualQueue = 'routine';
    if (evaluation.isUrgent) {
      actualQueue = 'urgent';
    } else if (evaluation.isOverdue) {
      actualQueue = 'overdue';
    } else if (evaluation.needsAssessment) {
      actualQueue = 'needs_assessment';
    }

    const isMatch = actualQueue === item.expectedQueue;
    if (isMatch) {
      deptStats[item.dept].passed++;
    } else {
      failures.push({
        id: item.id,
        dept: item.dept.toUpperCase(),
        expected: item.expectedQueue,
        actual: actualQueue,
        description: item.description,
        reason: evaluation.priorityReason,
      });
    }

    // Category metrics
    if (item.expectedQueue === 'urgent') {
      totalUrgent++;
      if (evaluation.isUrgent) {
        correctUrgent++;
      } else {
        missedUrgent++;
      }
    } else {
      if (evaluation.isUrgent) {
        falseUrgent++;
      }
    }

    if (item.expectedQueue === 'overdue') {
      totalOverdue++;
      if (evaluation.isOverdue) {
        correctOverdue++;
      }
    }

    if (item.expectedQueue === 'routine') {
      totalRoutine++;
      if (!evaluation.qualifiesForPriorityQueue) {
        correctRoutineExclusion++;
      }
    }

    if (item.expectedQueue === 'needs_assessment') {
      totalNeedsAssessment++;
      if (evaluation.needsAssessment) {
        correctNeedsAssessment++;
      }
    }
  }

  // Print Summary Results
  console.log('SUMMARY METRICS ACROSS 180 CASES:');
  console.log('------------------------------------------------------------------------------');
  console.log(`Total Test Cases: ${CHALLENGE_DATASET.length}`);
  console.log(`Total Passes: ${CHALLENGE_DATASET.length - failures.length} / ${CHALLENGE_DATASET.length} (${((CHALLENGE_DATASET.length - failures.length) / CHALLENGE_DATASET.length * 100).toFixed(1)}%)`);
  console.log('\n--- URGENCY BENCHMARKS ---');
  console.log(`Urgent Cases Evaluated: ${totalUrgent}`);
  console.log(`Correct Urgent Detections: ${correctUrgent} / ${totalUrgent}`);
  console.log(`Missed Urgent Emergencies (False Negatives): ${missedUrgent}`);
  console.log(`False Urgent Alarms (False Positives): ${falseUrgent}`);
  const precision = totalUrgent > 0 ? (correctUrgent / (correctUrgent + falseUrgent)) * 100 : 100;
  const recall = totalUrgent > 0 ? (correctUrgent / totalUrgent) * 100 : 100;
  console.log(`Urgent Detection Precision: ${precision.toFixed(1)}%`);
  console.log(`Urgent Detection Recall: ${recall.toFixed(1)}%`);

  console.log('\n--- OVERDUE & ROUTINE BENCHMARKS ---');
  console.log(`Overdue Decisions Correct: ${correctOverdue} / ${totalOverdue} (${(correctOverdue / totalOverdue * 100).toFixed(1)}%)`);
  console.log(`Routine Complaints Kept OUT of Priority Queue: ${correctRoutineExclusion} / ${totalRoutine} (${(correctRoutineExclusion / totalRoutine * 100).toFixed(1)}%)`);
  console.log(`Needs Assessment Detected: ${correctNeedsAssessment} / ${totalNeedsAssessment} (${(correctNeedsAssessment / totalNeedsAssessment * 100).toFixed(1)}%)`);

  console.log('\n--- RESULTS BY DEPARTMENT ---');
  for (const [dept, s] of Object.entries(deptStats)) {
    console.log(`  - ${dept.toUpperCase()}: ${s.passed} / ${s.total} (${(s.passed / s.total * 100).toFixed(1)}%)`);
  }

  if (failures.length > 0) {
    console.log('\n--- FAILURE DETAILS ---');
    for (const f of failures) {
      console.log(`[${f.id}] Dept: ${f.dept} | Expected: ${f.expected} | Actual: ${f.actual}`);
      console.log(`   Text: "${f.description}"`);
      console.log(`   Reason: ${f.reason}\n`);
    }
  } else {
    console.log('\nAll 180 challenge cases PASSED with 100% adherence!');
  }
}

runEvaluation();
