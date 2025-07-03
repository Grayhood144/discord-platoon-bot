// drSauce.js - A chaotic field doctor from Helldivers 2
const SAUCE_USER_ID = '603550636545540096';
const LEO_USER_ID = '544946624506495009';

// Quote categories with 20 quotes each
const STARTERS = [
    "BY THE POWER OF SCIENCE!",
    "GREETINGS, TEST SUBJECTS!",
    "AH, FRESH MEAT FOR THE GRINDER!",
    "WHO NEEDS A DOSE OF FREEDOM?",
    "TIME FOR SOME FIELD TESTING!",
    "DOCTOR IN THE HOUSE!",
    "MEDICAL EMERGENCY? I THINK YES!",
    "WHO'S READY FOR TREATMENT?",
    "SCIENCE WAITS FOR NO ONE!",
    "EXPERIMENTAL MEDICINE TIME!",
    "PAGING DR. SAUCE!",
    "MEDICAL CHAOS INCOMING!",
    "WHO ORDERED THE DOCTOR?",
    "TIME TO PRACTICE MEDICINE!",
    "DOCTOR'S ORDERS!",
    "MEDICAL MAYHEM ACTIVATED!",
    "READY FOR YOUR CHECKUP?",
    "THE DOCTOR WILL SEE YOU NOW!",
    "MEDICAL EMERGENCY? PERFECT!",
    "TIME TO SPREAD SOME HEALING!"
];

const MIDDLES = [
    "My diagnosis? MORE EXPLOSIONS!",
    "This might sting... A LOT!",
    "Side effects may include VICTORY!",
    "The cure is MORE DAKKA!",
    "Take two grenades and call me never!",
    "I prescribe MAXIMUM FIREPOWER!",
    "Your treatment plan? CHAOS!",
    "The best medicine is REVENGE!",
    "This won't hurt a bit... ME!",
    "Time for aggressive treatment!",
    "The prognosis is DESTRUCTION!",
    "Medicine is just spicy science!",
    "Your insurance covers this... probably!",
    "Treatment is non-negotiable!",
    "This might leave a scar... or ten!",
    "The cure is MORE BULLETS!",
    "Time for experimental procedures!",
    "Your condition is... PERFECT!",
    "Let's try something NEW!",
    "This might be unethical... PERFECT!"
];

const ENDINGS = [
    "FOR SCIENCE!",
    "FOR SUPER EARTH!",
    "DEMOCRACY DELIVERED!",
    "TREATMENT COMPLETE!",
    "NEXT PATIENT PLEASE!",
    "SCIENCE PREVAILS!",
    "EXPERIMENT SUCCESSFUL!",
    "DEMOCRACY IS NON-NEGOTIABLE!",
    "MEDICAL VICTORY ACHIEVED!",
    "PATIENT STATUS: LIBERATED!",
    "FREEDOM ADMINISTERED!",
    "DIAGNOSIS: SUCCESSFUL!",
    "MEDICAL MISSION COMPLETE!",
    "DEMOCRACY DISPENSED!",
    "TREATMENT SUCCESSFUL!",
    "SCIENCE WINS AGAIN!",
    "MEDICAL EXCELLENCE!",
    "EXPERIMENT CONCLUDED!",
    "FREEDOM DELIVERED!",
    "DOCTOR OUT!"
];

const SIGNATURES = [
    "- Dr. Sauce, MD (Mad Doctor)",
    "- Dr. Sauce, PhD in CHAOS",
    "- Dr. Sauce, Master of Medical Mayhem",
    "- Dr. Sauce, Professional Chaos Agent",
    "- Dr. Sauce, Field Medicine Enthusiast",
    "- Dr. Sauce, Democracy Distributor",
    "- Dr. Sauce, Experimental Expert",
    "- Dr. Sauce, Science Enthusiast",
    "- Dr. Sauce, Liberty Dispenser",
    "- Dr. Sauce, Chaos Practitioner",
    "- Dr. Sauce, Freedom Pharmacist",
    "- Dr. Sauce, Medical Maverick",
    "- Dr. Sauce, Battlefield Biochemist",
    "- Dr. Sauce, Combat Medic Supreme",
    "- Dr. Sauce, Liberty's Physician",
    "- Dr. Sauce, Democracy's Doctor",
    "- Dr. Sauce, Chaos Consultant",
    "- Dr. Sauce, Medical Mercenary",
    "- Dr. Sauce, Science Specialist",
    "- Dr. Sauce, Freedom's Physician"
];

const COMBAT_QUOTES = [
    "PAIN IS JUST WEAKNESS LEAVING THE BODY... AND ENTERING THE ENEMY!",
    "THE BEST MEDICINE IS PREVENTIVE STRIKE!",
    "I'M A DOCTOR, BUT I ALSO PRESCRIBE BULLETS!",
    "TIME TO PERFORM SOME AGGRESSIVE SURGERY!",
    "MY FAVORITE MEDICAL TOOL? THE STRATAGEM!",
    "HEALING THROUGH SUPERIOR FIREPOWER!",
    "THE BEST DEFENSE IS MORE OFFENSE!",
    "MEDICAL PROCEDURE: APPLY BULLETS LIBERALLY!",
    "SIDE EFFECTS INCLUDE: TOTAL ANNIHILATION!",
    "TREATMENT PLAN: MAXIMUM DEVASTATION!",
    "SURGICAL PRECISION WITH HEAVY ORDINANCE!",
    "PRESCRIBING A DOSE OF DEMOCRACY!",
    "TIME FOR SOME AGGRESSIVE NEGOTIATIONS!",
    "MEDICAL EMERGENCY? APPLY EXPLOSIVES!",
    "THE CURE FOR TYRANNY IS MORE DAKKA!",
    "DEMOCRACY IS THE BEST MEDICINE!",
    "TREATMENT INVOLVES HEAVY WEAPONRY!",
    "MEDICAL PROTOCOL: UNLEASH CHAOS!",
    "PRESCRIBING A DOSE OF FREEDOM!",
    "TIME FOR THERAPEUTIC EXPLOSIONS!"
];

const MEDICAL_ADVICE = [
    "REMEMBER: BULLETS ARE JUST TINY METAL VITAMINS!",
    "FEELING DOWN? TRY MORE EXPLOSIONS!",
    "HEALTH TIP: DEMOCRACY IS THE BEST MEDICINE!",
    "MEDICAL FACT: YOU CAN'T BE SICK IF YOU'RE VICTORIOUS!",
    "DAILY PRESCRIPTION: MINIMUM 1000 ROUNDS!",
    "MEDICAL ADVICE: SHOOT FIRST, DIAGNOSE LATER!",
    "REMEMBER TO TAKE YOUR DAILY DOSE OF CHAOS!",
    "HEALTH SECRET: MORE DAKKA = MORE HEALTH!",
    "MEDICAL TIP: EXPLOSIONS CURE EVERYTHING!",
    "PRESCRIPTION: APPLY LIBERTY DIRECTLY TO FOREHEAD!",
    "DOCTOR'S NOTE: CHAOS IS A VALID TREATMENT!",
    "MEDICAL WISDOM: VICTORY HEALS ALL WOUNDS!",
    "HEALTH ADVISORY: MORE FIREPOWER NEEDED!",
    "TREATMENT SUGGESTION: INCREASE EXPLOSIVE DOSAGE!",
    "MEDICAL BULLETIN: FREEDOM IS THERAPEUTIC!",
    "HEALTH UPDATE: NEED MORE STRATAGEMS!",
    "CLINICAL TRIAL: TESTING NEW EXPLOSION THERAPY!",
    "MEDICAL STUDY: DEMOCRACY EXTENDS LIFE!",
    "HEALTH REMINDER: CHAOS IS GOOD FOR YOU!",
    "MEDICAL BREAKTHROUGH: MORE BULLETS = BETTER HEALTH!"
];

function getRandomQuote(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateDrSauceResponse(mentionType = 'normal') {
    if (mentionType === 'leo') {
        return "Leospartan wuz here";
    }

    let response = '';

    // Add starter
    response += getRandomQuote(STARTERS) + '\n\n';

    // Add middle section
    response += getRandomQuote(MIDDLES) + '\n\n';

    // 20% chance for combat quote
    if (Math.random() < 0.2) {
        response += getRandomQuote(COMBAT_QUOTES) + '\n\n';
    }

    // 20% chance for medical advice
    if (Math.random() < 0.2) {
        response += getRandomQuote(MEDICAL_ADVICE) + '\n\n';
    }

    // Add ending
    response += getRandomQuote(ENDINGS) + '\n\n';

    // Add signature
    response += getRandomQuote(SIGNATURES);

    return response;
}

function shouldDrSauceRespond(message) {
    // Check if message mentions "sauce" (case insensitive)
    const hasSauceMention = message.content.toLowerCase().includes('sauce');
    
    // Check if the specific user is mentioned
    const hasUserMention = message.mentions.users.has(SAUCE_USER_ID);

    // Check for Leo mention (extremely rare response)
    const hasLeoMention = message.mentions.users.has(LEO_USER_ID) || 
                         message.content.toLowerCase().includes('leo') ||
                         message.content.toLowerCase().includes('leospartan');
    
    if (hasLeoMention && Math.random() < 0.0000001) {
        return 'leo';
    }

    // 30% chance to respond if conditions are met
    return (hasSauceMention || hasUserMention) && Math.random() < 0.3;
}

module.exports = {
    generateDrSauceResponse,
    shouldDrSauceRespond
}; 