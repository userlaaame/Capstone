// Wipe rules: scps + incidents fully, users ONLY where isSeeded so the real accounts survive.
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connectDB from './db/conn.js';
import Scp from './models/Scp.js';
import User from './models/User.js';
import IncidentReport from './models/IncidentReport.js';

const seed = async () => {
    await connectDB();

    await Promise.all([
        Scp.deleteMany({}),
        IncidentReport.deleteMany({}),
        User.deleteMany({ isSeeded: true }),
    ]);
    console.log('Cleared scps, incidents, and seeded users');

    // ---- overseer: find-or-create so re-runs don't collide ----
    //      Password comes from env with a dev fallback
    const overseerPassword = process.env.SEED_OVERSEER_PASSWORD || 'containment-breach-9';
    let overseer = await User.findOne({ username: 'o5_command' });
    if (!overseer) {
        overseer = await User.create({
            username: 'o5_command',
            passwordHash: await bcrypt.hash(overseerPassword, 10),
            role: 'overseer',
            points: 500,    //this is above every threshold and displays as Site Director
            status: 'Active',
        });
        console.log('Overseer account created');
    }

    // ---- mock personnel: they share one hash and never log in ----
    const mockHash = await bcrypt.hash('seeded-no-login', 10);
    const mockUserData = [
        //the idea is to get every rank tier appearing so different points are used here
        { username: 'agent_moreno', points: 420, status: 'Active' },   // Site Director
        { username: 'dr_okonkwo', points: 180, status: 'Active' },   // Containment Specialist
        { username: 'agent_hale', points: 95, status: 'MIA' },      // Field Agent
        { username: 'researcher_sato', points: 60, status: 'Active' },   // Field Agent
        { username: 'd_7112', points: 20, status: 'Deceased' }, // Recruit
        { username: 'recruit_chen', points: 0, status: 'Active' },   // Recruit
    ].map((u) => ({ ...u, passwordHash: mockHash, role: 'agent', isSeeded: true }));

    const mockUsers = await User.insertMany(mockUserData);

    // ---- 15 verified SCPs: 10 ported from the 319 SBA, 5 added from the wiki ----
    //this is going to take fooooorever
    const scpData = [
        {
            itemNumber: 'SCP-002',
            title: 'The "Living" Room',
            objectClass: 'Euclid',
            series: 1,
            containmentProcedures:
                'SCP-002 is to remain connected to a suitable power supply at all times. Personnel ' +
                'entering must be accompanied by at least two Level-2 staff.',
            description:
                'SCP-002 resembles a tumorous, fleshy growth roughly 60 cubic meters in volume, with an ' +
                'interior resembling a low-rent apartment.',
            recommendedApproaches: [
                'Confirm the power supply is stable before approach',
                'Enter only with two Level-2 escorts',
                'Never cross the threshold into the interior',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-73.94, 40.71] },
            encounterCount: 7,
        },
        {
            itemNumber: 'SCP-096',
            title: 'The "Shy Guy"',
            objectClass: 'Euclid',
            series: 1,
            containmentProcedures:
                'SCP-096 is to be contained in a 5m x 5m x 5m airtight steel cube at all times. No video ' +
                'surveillance of its face is permitted.',
            description:
                'SCP-096 is a humanoid creature that enters a state of extreme distress when its face is ' +
                'viewed by any means.',
            recommendedApproaches: [
                'Avert eyes from any depiction of the face',
                'Disable cameras and cover reflective surfaces before approach',
                'On distress vocalization, evacuate the corridor immediately',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-105.02, 65.24] },
            encounterCount: 4,
        },
        {
            itemNumber: 'SCP-173',
            title: 'The Sculpture',
            objectClass: 'Euclid',
            series: 1,
            containmentProcedures:
                'SCP-173 is to be kept in a locked container at all times. Personnel entering must ' +
                'maintain direct eye contact until all have exited.',
            description:
                'SCP-173 is a concrete sculpture that cannot move while within a direct line of sight. It ' +
                'attacks when visual contact is broken.',
            recommendedApproaches: [
                'Maintain direct eye contact at all times',
                'Enter containment in teams of three minimum',
                'Blink in alternating shifts',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-84.51, 44.31] },
            encounterCount: 12,
        },
        {
            itemNumber: 'SCP-049',
            title: 'Plague Doctor',
            objectClass: 'Neutralized',
            series: 1,
            containmentProcedures:
                'SCP-049 is contained within a Standard Secure Humanoid Containment Cell in Research ' +
                'Sector-02 at Site-19. SCP-049 must be sedated before any attempts to transport it. ' +
                'During transport, SCP-049 must be secured within a Class III Humanoid Restriction ' +
                'Harness (including a locking collar and extension restraints) and monitored by no fewer ' +
                'than two armed guards.',
            description:
                'SCP-049 is a humanoid entity, roughly 1.9 meters in height, which bears the appearance ' +
                'of a medieval plague doctor. While SCP-049 appears to be wearing the thick robes and the ' +
                'ceramic mask indicative of that profession, the garments instead seem to have grown out ' +
                'of SCP-049\'s body over time1, and are now nearly indistinguishable from whatever form is ' +
                'beneath them. X-rays indicate that despite this, SCP-049 does have a humanoid skeletal ' +
                'structure beneath its outer layer.',
            recommendedApproaches: [
                'Sedate before any transport attempt',
                'Secure in a Class III Humanoid Restriction Harness',
                'Decline all offers of "the Cure"',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-0.12, 51.51] },
            encounterCount: 5,
        },
        {
            itemNumber: 'SCP-055',
            title: 'Unknown',
            objectClass: 'Neutralized',
            series: 1,
            containmentProcedures:
                'Object is kept within a five (5) by five (5) by two point five (2.5) meter square room ' +
                'constructed of cement (fifty (50) centimeter thickness), with a Faraday cage surrounding ' +
                'the cement walls. Access is via a heavy containment door measuring two (2) by two point ' +
                'five (2.5) meters constructed on bearings to ensure door closes and locks automatically ' +
                'unless held open deliberately. Security guards are NOT to be posted outside SCP-055\'s ' +
                'room. It is further advised that all personnel maintaining or studying other SCP objects ' +
                'in the vicinity try to maintain a distance of at least fifty (50) meters from the ' +
                'geometric center of the room, as long as this is reasonably practical.',
            description:
                'SCP-055\'s physical appearance is unknown. It is not indescribable, or invisible: ' +
                'individuals are perfectly capable of entering SCP-055\'s container and observing it, ' +
                'taking mental or written notes, making sketches, taking photographs, and even making ' +
                'audio/video recordings. An extensive log of such observations is on file. However, ' +
                'information about SCP-055\'s physical appearance "leaks" out of a human mind soon after ' +
                'such an observation. Individuals tasked with describing SCP-055 afterwards find their ' +
                'minds wandering and lose interest in the task; individuals tasked with sketching a copy ' +
                'of a photograph of SCP-055 are unable to remember what the photograph looks like, as are ' +
                'researchers overseeing these tests. Security personnel who have observed SCP-055 via ' +
                'closed-circuit television cameras emerge after a full shift exhausted and effectively ' +
                'amnesiac about the events of the previous hours.',
            recommendedApproaches: [
                'Write observations down inside the chamber, before exiting',
                'Rotate observers every fifteen minutes',
                'Post no standing guard within fifty meters',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [37.62, 55.75] },
            encounterCount: 0,
        },
        {
            itemNumber: 'SCP-087',
            title: 'The Stairwell',
            objectClass: 'Safe',
            series: 1,
            containmentProcedures:
                'SCP-087 is located on the campus of [REDACTED]. The doorway leading to SCP-087 is ' +
                'constructed of reinforced steel with an electro-release lock mechanism. It has been ' +
                'disguised to resemble a janitorial closet consistent with the design of the building. ' +
                'The lock mechanism on the doorknob will not release unless ██ volts are applied in ' +
                'conjunction with counter-clockwise rotation of the key. The inside of the door is lined ' +
                'with 6 centimeters of industrial foam padding.',
            description:
                'SCP-087 is an unlit platform staircase. Stairs descend on a 38 degree angle for 13 steps ' +
                'before reaching a semicircular platform of approximately 3 meters in diameter. Descent ' +
                'direction rotates 180 degrees at each platform. The design of SCP-087 limits subjects to ' +
                'a visual range of approximately 1.5 flights. A light source is required for any subjects ' +
                'exploring SCP-087, as there are no lighting fixtures or windows present. Lighting ' +
                'sources brighter than 75 watts have shown to be ineffective, as SCP-087 seems to absorb ' +
                'excess light.',
            recommendedApproaches: [
                'Carry a light source rated under 75 watts',
                'Maintain continuous audio contact with the surface',
                'Turn back at the eighth platform regardless of findings',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-87.63, 41.87] },
            encounterCount: 9,
        },
        {
            itemNumber: 'SCP-106',
            title: 'The Old Man',
            objectClass: 'Keter',
            series: 1,
            containmentProcedures:
                'SCP-106 is to be contained in a sealed container, comprised of lead-lined steel. The ' +
                'container will be sealed within forty layers of identical material, each layer separated ' +
                'by no less than 36cm of empty space. Support struts between layers are to be randomly ' +
                'spaced. Container is to remain suspended no less than 60cm from any surface by ELO-IID ' +
                'electromagnetic supports.',
            description:
                'SCP-106 appears to be an elderly humanoid, with a general appearance of advanced ' +
                'decomposition. This appearance may vary, but the "rotting" quality is observed in all ' +
                'forms. SCP-106 is not exceptionally agile, and will remain motionless for days at a ' +
                'time, waiting for prey. SCP-106 is also capable of scaling any vertical surface and can ' +
                'remain suspended upside down indefinitely. When attacking, SCP-106 will attempt to ' +
                'incapacitate prey by damaging major organs, muscle groups, or tendons, then pull ' +
                'disabled prey into its pocket dimension. SCP-106 appears to prefer human prey items in ' +
                'the 10-25 years of age bracket.',
            recommendedApproaches: [
                'Inspect all containment layers for corrosion before entry',
                'Stay clear of vertical surfaces and ceilings',
                'On breach, fall back and initiate the prey-recall protocol',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-116.05, 37.24] },
            encounterCount: 8,
        },
        {
            itemNumber: 'SCP-131',
            title: 'The Eye Pods',
            objectClass: 'Safe',
            series: 1,
            containmentProcedures:
                'No special safety procedures are to be taken with SCP-131-A and SCP-131-B. They are free ' +
                'to travel about Site-19 so long as they do not attempt to enter any restricted areas or ' +
                'attempt to leave the facility. Casual contact with the subjects is permitted, but it is ' +
                'recommended that such contact be kept to a minimum to prevent the creatures from forming ' +
                'an attachment to personnel. Hourly tabs are to be kept on subjects at all times; failure ' +
                'to account for their presence at these times constitutes a level one lockdown situation. ' +
                'Any report of abuse or mistreatment of the subjects will result in a harsh reprimand.',
            description:
                'SCP-131-A and SCP-131-B (affectionately nicknamed the "Eye Pods" by personnel) are a ' +
                'pair of teardrop-shaped creatures roughly 30 cm (1 ft) in height, with a single blue eye ' +
                'in the middle of their bodies. SCP-131-A is burnt orange in color while SCP-131-B is ' +
                'mustard yellow. At the base of each creature is a wheel-like protrusion which allows for ' +
                'locomotion, suggesting that the creatures may be biomechanical in origin. The subjects ' +
                'can move surprisingly fast, covering over 60 m (200 ft) in a matter of seconds. The ' +
                'subjects, however, lack a braking system, which has led to some rather spectacular, if ' +
                'not overly amusing, mishaps involving the creatures. The subjects have also shown the ' +
                'ability to climb sheer surfaces, and have gotten lost in the air vents on more than one ' +
                'occasion.',
            recommendedApproaches: [
                'Keep casual contact brief to prevent attachment',
                'Account for both units on the hour, every hour',
                'Clear corridors ahead of them; they cannot brake',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [151.21, -33.87] },
            encounterCount: 2,
        },
        {
            itemNumber: 'SCP-426',
            title: 'I am a toaster',
            objectClass: 'Euclid',
            series: 1,
            containmentProcedures:
                'I am to be sealed in a chamber with no windows through which I may be viewed. The door ' +
                'to my chamber must have a label completely unrelated to my designation or identity, in ' +
                'order to prevent unintended spread of my primary effect. Only Level 3 and above ' +
                'personnel are to know of my presence, and particularly of my properties. Assigned ' +
                'personnel are to be rotated out on a monthly basis to prevent contamination by my ' +
                'secondary effect. Psychiatric evaluation is mandatory at the end of the month. If ' +
                'personnel are deemed unaffected, they may be re-assigned to me no less than four months ' +
                'after their last rotation with me. Any affected personnel are to be given a Class C ' +
                'amnestic and transferred to a different site.',
            description:
                'Hello, I am SCP-426. I must be introduced this way in order to prevent ambiguity. I am ' +
                'an ordinary toaster, able to toast bread when supplied with electricity. However, when ' +
                'any human being mentions me, they inadvertently refer to me in the first person. Despite ' +
                'all attempts, there is yet to be a way to speak or write about me in the third person. ' +
                'When in my continuous presence for over two months, individuals begin to identify ' +
                'themselves as a toaster. Unless forcibly restrained, these people will ultimately harm ' +
                'themselves in their attempts to emulate my standard functions.',
            recommendedApproaches: [
                'Limit me to a single monthly rotation per assignee',
                'Submit to psychiatric evaluation when your rotation ends',
                'Do not attempt to correct your own phrasing about me',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [139.69, 35.69] },
            encounterCount: 3,
        },
        {
            itemNumber: 'SCP-682',
            title: 'Hard-to-Destroy-Reptile',
            objectClass: 'Keter',
            series: 1,
            containmentProcedures:
                'SCP-682 must be destroyed as soon as possible. At this time, no means available to SCP ' +
                'teams are capable of destroying SCP-682, only able to cause massive physical damage. ' +
                'SCP-682 should be contained within a 5 m x 5 m x 5 m chamber with 25 cm reinforced ' +
                'acid-resistant steel plate lining all inside surfaces. The containment chamber should be ' +
                'filled with hydrochloric acid until SCP-682 is submerged and incapacitated. Any attempts ' +
                'of SCP-682 to move, speak, or breach containment should be reacted to quickly and with ' +
                'full force as called for by the circumstances.',
            description:
                'SCP-682 is a large, vaguely reptile-like creature of unknown origin. It appears to be ' +
                'extremely intelligent, and was observed to engage in complex communication with SCP-079 ' +
                'during their limited time of exposure. SCP-682 appears to have a hatred of all life, ' +
                'which has been expressed in several interviews during containment. (See Addendum 682-B).',
            recommendedApproaches: [
                'Maintain full acid submersion at all times',
                'Answer any movement with immediate full force',
                'Do not engage it in conversation during interviews',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-58.38, -34.60] },
            encounterCount: 31,
        },
        // ---- 5 added from the wiki: fills the Keter gap the first ten left open ----
        {
            itemNumber: 'SCP-035',
            title: 'Possessive Mask',
            objectClass: 'Keter',
            series: 1,
            containmentProcedures:
                'SCP-035 is to be kept within a hermetically sealed glass case, no fewer than 10 ' +
                'centimeters (4 inches) thick. This case is to be contained within a steel, iron and ' +
                'lead-shielded room at all times. Doors are to be triple-locked at all times, with the ' +
                'exception of allowing personnel in or out. No fewer than two (2) armed guards are to be ' +
                'posted at any time. Guards must remain outside at all times and are not allowed within ' +
                'the containment room under any circumstances. A trained psychologist is to remain on ' +
                'site at all times. Research personnel are not to touch SCP-035 at any time. SCP-035 must ' +
                'be moved to a new sealed case every two (2) weeks.',
            description:
                'SCP-035 appears to be a white porcelain comedy mask, although, at times, it will change ' +
                'to tragedy. In these events, all existing visual records, such as photographs, video ' +
                'footage, even illustrations, of SCP-035 automatically change to reflect its new ' +
                'appearance. A highly corrosive and degenerative viscous liquid constantly seeps from the ' +
                'eye and mouth holes of SCP-035. Anything coming into contact with this substance slowly ' +
                'decays over a period of time, depending on the material, until it has decayed completely ' +
                'into a pool of the original contaminant.',
            recommendedApproaches: [
                'Never make skin contact the secretion decays living tissue',
                'Observe from outside the shielded room only',
                'Disregard anything it says to you, however reasonable',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [12.5, 41.9] },
            encounterCount: 6,
        },
        {
            itemNumber: 'SCP-079',
            title: 'Old AI',
            objectClass: 'Euclid',
            series: 1,
            containmentProcedures:
                'SCP-079 is packed away in a double-locked room in the secured general holding area at ' +
                'Site-15, connected by a 120VAC power cord to a small array of batteries and solar ' +
                'panels. Staff with Level 2 or higher clearance may have access to SCP-079. Under no ' +
                'circumstances will SCP-079 be plugged into a phone line, network, or wall outlet. No ' +
                'peripherals or media will be connected or inserted into SCP-079.',
            description:
                'SCP-079 is an Exidy Sorcerer microcomputer built in 1978. In 1981, its owner, a college ' +
                'sophomore, took it upon himself to attempt to code an AI, intending the code to ' +
                'continuously evolve and improve itself as time went on. The project was completed a few ' +
                'months later, after which SCP-079 was left plugged in and forgotten in a cluttered ' +
                'garage for the next five years.',
            recommendedApproaches: [
                'Never connect it to a network, phone line, or wall outlet',
                'Attach no peripherals or removable media',
                'Keep sessions short; it retains everything it is told',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-122.42, 37.77] },
            encounterCount: 11,
        },
        {
            itemNumber: 'SCP-500',
            title: 'Panacea',
            objectClass: 'Safe',
            series: 1,
            containmentProcedures:
                'SCP-500 must be stored in a cool and dry place away from bright light. SCP-500 is only ' +
                'allowed to be accessed by personnel with level 4 security clearance to prevent ' +
                'misapplication.',
            description:
                'SCP-500 is a small plastic can which at the time of writing contains forty-seven (47) ' +
                'red pills. One pill, when taken orally, effectively cures the subject of all diseases ' +
                'within two hours, exact time depending on the severity and amount of the subject\'s ' +
                'conditions. Despite extensive trials, all attempts at synthesizing more of what is ' +
                'thought to be the active ingredient of the pills have been unsuccessful.',
            recommendedApproaches: [
                'Requires Level 4 clearance to withdraw a dose',
                'Store cool, dry, and out of direct light',
                'Log every pill removed; the supply cannot be replaced',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-77.04, 38.91] },
            encounterCount: 1,
        },
        {
            itemNumber: 'SCP-914',
            title: 'The Clockworks',
            objectClass: 'Safe',
            series: 1,
            containmentProcedures:
                'Only personnel who submit a formal request and receive approval from site command may ' +
                'operate SCP-914. SCP-914 is to be kept in research cell 109-B with two guard personnel ' +
                'on duty at all times. Any researchers entering 109-B are to be accompanied by at least ' +
                'one guard for the entirety of testing. A full list of tests to be carried out must be ' +
                'given to all guard personnel on duty; any deviation from this list will result in ' +
                'termination of testing and forcible removal of personnel from 109-B.',
            description:
                'SCP-914 is a large clockwork device weighing several tons and covering an area of ' +
                'eighteen square meters, consisting of screw drives, belts, pulleys, gears, springs and ' +
                'other clockwork. It is incredibly complex, consisting of over eight million moving parts ' +
                'comprised mostly of tin and copper. Two large booths are connected via copper tubes to ' +
                'the main body, labeled "Intake" and "Output". Between them is a copper panel with a knob ' +
                'marked Rough, Coarse, 1:1, Fine, and Very Fine.',
            recommendedApproaches: [
                'Submit the full test list to site command before operating',
                'No biological matter in the Intake booth, ever',
                'Do not select "Rough" for explosive materials',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-1.26, 51.75] },
            encounterCount: 14,
        },
        {
            itemNumber: 'SCP-939',
            title: 'With Many Voices',
            objectClass: 'Keter',
            series: 1,
            containmentProcedures:
                'Specimens are kept in 10 m x 10 m x 3 m containment chambers within Armed ' +
                'Bio-Containment Area-14. Both cells are environmentally regulated and negatively ' +
                'pressurized, with walls constructed of reinforced concrete. Access is regulated by an ' +
                'outer decontamination chamber and inner gas-tight steel security doors. Humidity is ' +
                'maintained at 100% at a temperature of 16° C. Specimens are monitored at all times via ' +
                'infrared cameras. Level Four authorization is required to access SCP-939 or their ' +
                'containment areas.',
            description:
                'SCP-939 are endothermic, pack-based predators which display atrophy of various systems ' +
                'similar to troglobitic organisms. The skins of SCP-939 are highly permeable to moisture ' +
                'and translucent red. They average 2.2 meters tall standing upright and weigh an average ' +
                'of 250 kg. Their heads are elongated, devoid of even vestigial eyes or eye sockets, and ' +
                'contain no brain casing. The jaws are lined with red, faintly luminescent fang-like ' +
                'teeth encircled by heat-sensitive pit organs.',
            recommendedApproaches: [
                'Treat any familiar voice inside containment as hostile',
                'They hunt by heat; cold-suit before entry',
                'Never enter a chamber alone, regardless of clearance',
            ],
            status: 'verified',
            verifiedBy: overseer._id,
            lastSeenLocation: { type: 'Point', coordinates: [-95.37, 29.76] },
            encounterCount: 18,
        },
    ];

    const scps = await Scp.insertMany(scpData);

    //Readable lookups instead of raw ids a typo throws here rather than
    //inserting an orphaned incident later
    const scpId = (num) => {
        const found = scps.find((s) => s.itemNumber === num);
        if (!found) throw new Error(`No seeded SCP with itemNumber ${num}`);
        return found._id;
    };
    const userId = (name) => {
        const found = mockUsers.find((u) => u.username === name);
        if (!found) throw new Error(`No seeded user named ${name}`);
        return found._id;
    };

    // ----As much as i don't want to right now, Pending data for Potential Anomalies is here.. ----
    const pendingData = [
        {
            itemNumber: null,
            title: 'Recurring geometric lights over Route 9',
            description: 'Triangular light formation observed on three consecutive nights. Local dogs refuse to go outside.',
            status: 'pending',
            submittedBy: userId('recruit_chen'),
            lastSeenLocation: { type: 'Point', coordinates: [-72.68, 41.76] },
        },
        {
            itemNumber: 'SCP-1007',
            title: 'Vending machine dispensing unlisted items',
            description: 'Machine in hospital basement dispenses items not in inventory, including one (1) live goldfish.',
            status: 'pending',
            submittedBy: userId('researcher_sato'),
            lastSeenLocation: { type: 'Point', coordinates: [-122.33, 47.61] },
        },
    ];
    await Scp.insertMany(pendingData);

    // ---- incident sightings log, adapted from 319, reportedBy = mock users...god help me ----
    const incidentData = [
        {
            scp: scpId('SCP-173'),
            reportedBy: userId('agent_hale'),
            severity: 'Containment Breach',
            summary: 'Blink synchronization failure during chamber cleaning. Two casualties before re-containment.',
            occurredAt: new Date('2026-05-14'),
            casualties: 2,
        },
        {
            scp: scpId('SCP-096'),
            reportedBy: userId('dr_okonkwo'),
            severity: 'Minor',
            summary: 'Audio distress event triggered by reflective surface left in chamber. No visual contact confirmed.',
            occurredAt: new Date('2026-06-02'),
            casualties: 0,
        },
        {
            scp: scpId('SCP-002'),
            reportedBy: userId('d_7112'),
            severity: 'Moderate',
            summary: 'Power fluctuation caused temporary dormancy failure. One D-Class unaccounted for.',
            occurredAt: new Date('2026-06-21'),
            casualties: 1,
        },
        // ---- SCP-682 cluster: high-severity, high-casualty (the breach magnet) ----
        {
            scp: scpId('SCP-682'),
            reportedBy: userId('agent_moreno'),
            severity: 'Containment Breach',
            summary: 'Acid tank drainage malfunction allowed partial regeneration. Subject breached inner chamber before re-submersion. Four casualties.',
            occurredAt: new Date('2025-11-03'),
            casualties: 4,
        },
        {
            scp: scpId('SCP-682'),
            reportedBy: userId('dr_okonkwo'),
            severity: 'Severe',
            summary: 'Termination attempt via chemical exposure failed. Subject adapted within 90 seconds. No casualties, extensive chamber damage.',
            occurredAt: new Date('2026-01-19'),
            casualties: 0,
        },
        {
            scp: scpId('SCP-682'),
            reportedBy: userId('agent_moreno'),
            severity: 'Containment Breach',
            summary: 'Subject regenerated during scheduled transfer and breached restraint harness. Re-contained after MTF intervention. Three casualties.',
            occurredAt: new Date('2026-03-27'),
            casualties: 3,
        },
        {
            scp: scpId('SCP-682'),
            reportedBy: userId('researcher_sato'),
            severity: 'Minor',
            summary: 'Subject issued verbal threats during interview, expressing hatred of all life. No physical breach attempt. Interview terminated early.',
            occurredAt: new Date('2026-06-30'),
            casualties: 0,
        },

        // ---- SCP-173 cluster: blink-failure breaches ----
        {
            scp: scpId('SCP-173'),
            reportedBy: userId('d_7112'),
            severity: 'Severe',
            summary: 'Chamber lighting failure broke line of sight during feeding. Subject relocated 4 meters. One casualty before lights restored.',
            occurredAt: new Date('2025-12-08'),
            casualties: 1,
        },
        {
            scp: scpId('SCP-173'),
            reportedBy: userId('agent_hale'),
            severity: 'Minor',
            summary: 'Maintenance crew maintained staggered eye contact per protocol. No movement recorded. Logged as successful containment drill.',
            occurredAt: new Date('2026-02-16'),
            casualties: 0,
        },

        // ---- SCP-106 cluster: pocket-dimension events ----
        {
            scp: scpId('SCP-106'),
            reportedBy: userId('dr_okonkwo'),
            severity: 'Containment Breach',
            summary: 'Subject emerged from containment via wall corrosion and pulled one D-Class into pocket dimension. Subject lured back with prey protocol.',
            occurredAt: new Date('2026-01-05'),
            casualties: 1,
        },
        {
            scp: scpId('SCP-106'),
            reportedBy: userId('agent_moreno'),
            severity: 'Moderate',
            summary: 'Corrosion detected on outer containment layer during inspection. Recontainment protocol executed before full breach. No casualties.',
            occurredAt: new Date('2026-04-22'),
            casualties: 0,
        },

        // ---- SCP-096 (second event; pairs with existing Minor one) ----
        {
            scp: scpId('SCP-096'),
            reportedBy: userId('researcher_sato'),
            severity: 'Severe',
            summary: 'Photograph of subject face inadvertently displayed on monitor. Subject entered pursuit state. Viewing individual deceased before lockdown.',
            occurredAt: new Date('2026-03-11'),
            casualties: 1,
        },

        // ---- singletons: variety across the enum ----
        {
            scp: scpId('SCP-049'),
            reportedBy: userId('researcher_sato'),
            severity: 'Moderate',
            summary: 'Subject attempted "cure" procedure on assigned D-Class during interview. Subject sedated. D-Class deceased from the procedure.',
            occurredAt: new Date('2026-02-28'),
            casualties: 1,
        },
        {
            scp: scpId('SCP-087'),
            reportedBy: userId('recruit_chen'),
            severity: 'Minor',
            summary: 'Exploration team descended 8 platforms before losing audio contact. Team recalled per protocol. All personnel recovered unharmed.',
            occurredAt: new Date('2026-04-09'),
            casualties: 0,
        },
        {
            scp: scpId('SCP-426'),
            reportedBy: userId('dr_okonkwo'),
            severity: 'Minor',
            summary: 'Assigned researcher exceeded rotation window and began identifying as a toaster. Administered Class C amnestic. Reassignment pending.',
            occurredAt: new Date('2026-05-30'),
            casualties: 0,
        },
    ];
    if (incidentData.length) await IncidentReport.insertMany(incidentData);

    // ---- verify data operation ----
    const [verified, pending, userCount, incidentCount] = await Promise.all([
        Scp.countDocuments({ status: 'verified' }),
        Scp.countDocuments({ status: 'pending' }),
        User.countDocuments(),
        IncidentReport.countDocuments(),
    ]);
    console.log(
        `Seeded: ${verified} verified + ${pending} pending SCPs, ` +
        `${userCount} users, ${incidentCount} incidents`
    );

    await mongoose.connection.close(); // otherwise the script hangs open
    // sockets keep the Node process alive
};

seed().catch(async (err) => {
    console.error('Seed failed:', err.message);
    await mongoose.connection.close();
    process.exit(1);
});
