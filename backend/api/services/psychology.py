from typing import List, Dict

BFI_20_QUESTIONS = [
    {"id": 1, "text": "O'zimni davralarning \"markazida\" deb hisoblayman.", "trait": "E", "sign": 1},
    {"id": 2, "text": "Boshqalarning hissiyotlarini tushunaman, ularga hamdard bo'laman.", "trait": "A", "sign": 1},
    {"id": 3, "text": "Doim ishlarni puxta va tartib bilan bajaraman.", "trait": "C", "sign": 1},
    {"id": 4, "text": "Tez-tez xavotirga tushaman va tashvishlanaman.", "trait": "ES", "sign": -1},
    {"id": 5, "text": "Yangi g'oyalar va murakkab nazariyalarga qiziqaman.", "trait": "O", "sign": 1},
    {"id": 6, "text": "Ko'pincha kamgapman va odamlar orasida indamay o'tiraman.", "trait": "E", "sign": -1},
    {"id": 7, "text": "Boshqalarning muammolari menga unchalik qiziqmas.", "trait": "A", "sign": -1},
    {"id": 8, "text": "Ba'zida mas'uliyatsizlik qilaman va ishlarga e'tiborsizman.", "trait": "C", "sign": -1},
    {"id": 9, "text": "Har qanday qiyin vaziyatda ham xotirjamlikni saqlayman.", "trait": "ES", "sign": 1},
    {"id": 10, "text": "Tasavvur qilishdan ko'ra, amaliy ishlarni afzal ko'raman.", "trait": "O", "sign": -1},
    {"id": 11, "text": "Yangi odamlar bilan oson muloqotga kirishaman.", "trait": "E", "sign": 1},
    {"id": 12, "text": "Men odamlarga ishonaman.", "trait": "A", "sign": 1},
    {"id": 13, "text": "O'z oldimga qo'ygan maqsadlarimga erishmaguncha to'xtamayman.", "trait": "C", "sign": 1},
    {"id": 14, "text": "Kayfiyatim tez-tez o'zgarib turadi, tez tushkunlikka tushaman.", "trait": "ES", "sign": -1},
    {"id": 15, "text": "San'at, musiqa va adabiyotning go'zalligini his qilaman.", "trait": "O", "sign": 1},
    {"id": 16, "text": "Diqqat markazida bo'lishni yoqtirmayman.", "trait": "E", "sign": -1},
    {"id": 17, "text": "Ko'pincha boshqalar bilan bahslashaman, qaysarman.", "trait": "A", "sign": -1},
    {"id": 18, "text": "Reja asosida ishlashni yoqtirmayman, tartibsizroqman.", "trait": "C", "sign": -1},
    {"id": 19, "text": "Stressli vaziyatlarda ham o'zimni boshqara olaman.", "trait": "ES", "sign": 1},
    {"id": 20, "text": "Kundalik odatiy ishlarni o'zgartirishni yoqtirmayman.", "trait": "O", "sign": -1},
]

TRAIT_NAMES = {
    "O": "Yangilikka ochiqlik",
    "C": "Mas'uliyat va intizom",
    "E": "Kirishimlilik",
    "A": "Hamkorlikka moyillik",
    "ES": "Hissiy barqarorlik",
}

TRAIT_DESCRIPTIONS = {
    "O": "Tasavvur, ijodkorlik va yangi g'oyalarga qiziqish",
    "C": "Tartib, rejalashtirish va maqsadga intilish",
    "E": "Ijtimoiy faollik va odamlar bilan muloqotga moyillik",
    "A": "Hamdardlik, ishonch va hamkorlikka ochiqlik",
    "ES": "Stressga bardoshlilik va emotsional muvozanat",
}

def evaluate_psychological_test(answers: Dict[str, int]) -> Dict:
    """
    answers format: {"1": 4, "2": 5, ...}  values from 1 to 5.
    Returns calculated percentages for each trait and overall.
    """
    traits_score = {"O": 0, "C": 0, "E": 0, "A": 0, "ES": 0}
    traits_max = {"O": 20, "C": 20, "E": 20, "A": 20, "ES": 20}  # 4 questions * 5 max each

    for q in BFI_20_QUESTIONS:
        q_id = str(q["id"])
        if q_id not in answers:
            continue
        
        val = int(answers[q_id])
        if val < 1 or val > 5:
            val = 3 # fallback to neutral
            
        if q["sign"] == 1:
            traits_score[q["trait"]] += val
        else:
            traits_score[q["trait"]] += (6 - val)

    results = []
    total_score = 0
    total_max = 100
    
    for trait_key in ["O", "C", "E", "A", "ES"]:
        score = traits_score[trait_key]
        percentage = int((score / traits_max[trait_key]) * 100)
        total_score += score
        
        results.append({
            "trait_id": trait_key,
            "name": TRAIT_NAMES[trait_key],
            "description": TRAIT_DESCRIPTIONS[trait_key],
            "score": score,
            "percentage": percentage
        })

    overall_percentage = int((total_score / total_max) * 100)
    
    # Calculate grade like C+
    grade = "C"
    if overall_percentage >= 90: grade = "A"
    elif overall_percentage >= 85: grade = "A-"
    elif overall_percentage >= 80: grade = "B+"
    elif overall_percentage >= 75: grade = "B"
    elif overall_percentage >= 70: grade = "B-"
    elif overall_percentage >= 65: grade = "C+"
    elif overall_percentage >= 60: grade = "C"
    elif overall_percentage >= 50: grade = "C-"
    else: grade = "D"

    recommendations = []
    if overall_percentage >= 75:
        recommendations.append("Yaxshi natija! Siz turli xil vaziyatlarga oson moslasha olasiz.")
    else:
        recommendations.append("Yaxshi natija! Yana bir oz tayyorgarlik ko'ring.")
        
    for res in results:
        if res["percentage"] < 50:
            recommendations.append(f"Zaif tomonlaringizga e'tibor bering va ularni yaxshilang ({res['name']}).")
            
    recommendations.append("Karyera yo'nalishingizni aniqlash uchun professional konsultant bilan maslahatlashing.")
    
    return {
        "overall_percentage": overall_percentage,
        "grade": grade,
        "traits": results,
        "recommendations": list(set(recommendations))[:3],
        "answers_raw": answers
    }
