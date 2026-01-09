// src/services/bloodRuleEngine.js

export const ruleBasedBloodAnalysis = (currentTest, previousTests = []) => {
  const analiz = [];
  const v = currentTest.değerler || {};
  const prev = previousTests[0]?.değerler || {};

  let riskScore = 0;

  const compareWithPrevious = (name, current, previous) => {
    if (previous === undefined) return null;
    if (current > previous) return `${name} önceki ölçüme göre artmış (${previous} → ${current}).`;
    if (current < previous) return `${name} önceki ölçüme göre düşmüş (${previous} → ${current}).`;
    return `${name} önceki ölçüme göre değişmemiş.`;
  };

  // GLUKOZ
  if (v.Glukoz !== undefined) {
    if (v.Glukoz < 70) {
      analiz.push(`Glukoz düşük (${v.Glukoz}). Hipoglisemi riski olabilir.`);
      riskScore += 2;
    } else if (v.Glukoz <= 110) {
      analiz.push(`Glukoz normal (${v.Glukoz}).`);
    } else if (v.Glukoz <= 126) {
      analiz.push(`Glukoz sınırda yüksek (${v.Glukoz}). Takip önerilir.`);
      riskScore += 1;
    } else {
      analiz.push(`Glukoz yüksek (${v.Glukoz}). Diyabet riski olabilir.`);
      riskScore += 3;
    }

    const diff = compareWithPrevious('Glukoz', v.Glukoz, prev.Glukoz);
    if (diff) analiz.push(diff);
  }

  // DEMİR
  if (v.Demir !== undefined) {
    if (v.Demir < 60) {
      analiz.push(`Demir düşük (${v.Demir}). Halsizlik yapabilir.`);
      riskScore += 2;
    } else if (v.Demir > 170) {
      analiz.push(`Demir yüksek (${v.Demir}). Doktor kontrolü önerilir.`);
      riskScore += 1;
    } else {
      analiz.push(`Demir normal (${v.Demir}).`);
    }

    const diff = compareWithPrevious('Demir', v.Demir, prev.Demir);
    if (diff) analiz.push(diff);
  }

  // HEMOGLOBİN
  if (v.Hemoglobin !== undefined) {
    if (v.Hemoglobin < 12) {
      analiz.push(`Hemoglobin düşük (${v.Hemoglobin}). Kansızlık belirtisi olabilir.`);
      riskScore += 2;
    } else {
      analiz.push(`Hemoglobin normal (${v.Hemoglobin}).`);
    }

    const diff = compareWithPrevious('Hemoglobin', v.Hemoglobin, prev.Hemoglobin);
    if (diff) analiz.push(diff);
  }

  // TROMBOSİT
  if (v.Trombosit !== undefined) {
    if (v.Trombosit < 150) {
      analiz.push(`Trombosit düşük (${v.Trombosit}). Kanama riski olabilir.`);
      riskScore += 2;
    } else if (v.Trombosit > 450) {
      analiz.push(`Trombosit yüksek (${v.Trombosit}). Pıhtı riski olabilir.`);
      riskScore += 2;
    } else {
      analiz.push(`Trombosit normal (${v.Trombosit}).`);
    }

    const diff = compareWithPrevious('Trombosit', v.Trombosit, prev.Trombosit);
    if (diff) analiz.push(diff);
  }

  // BEYAZ KÜRE
  if (v.BeyazKüre !== undefined) {
    if (v.BeyazKüre < 4) {
      analiz.push(`Beyaz küre düşük (${v.BeyazKüre}). Bağışıklık zayıflamış olabilir.`);
      riskScore += 2;
    } else if (v.BeyazKüre > 11) {
      analiz.push(`Beyaz küre yüksek (${v.BeyazKüre}). Enfeksiyon belirtisi olabilir.`);
      riskScore += 2;
    } else {
      analiz.push(`Beyaz küre normal (${v.BeyazKüre}).`);
    }

    const diff = compareWithPrevious('Beyaz küre', v.BeyazKüre, prev.BeyazKüre);
    if (diff) analiz.push(diff);
  }

  // KREATİNİN
  if (v.Kreatinin !== undefined) {
    if (v.Kreatinin > 1.3) {
      analiz.push(`Kreatinin yüksek (${v.Kreatinin}). Böbrek fonksiyonları değerlendirilmelidir.`);
      riskScore += 3;
    } else {
      analiz.push(`Kreatinin normal (${v.Kreatinin}).`);
    }

    const diff = compareWithPrevious('Kreatinin', v.Kreatinin, prev.Kreatinin);
    if (diff) analiz.push(diff);
  }

  // KOLESTEROL
  if (v.Kolesterol !== undefined) {
    if (v.Kolesterol < 200) {
      analiz.push(`Kolesterol normal (${v.Kolesterol}).`);
    } else if (v.Kolesterol < 240) {
      analiz.push(`Kolesterol sınırda yüksek (${v.Kolesterol}).`);
      riskScore += 1;
    } else {
      analiz.push(`Kolesterol yüksek (${v.Kolesterol}). Kalp-damar riski artabilir.`);
      riskScore += 3;
    }

    const diff = compareWithPrevious('Kolesterol', v.Kolesterol, prev.Kolesterol);
    if (diff) analiz.push(diff);
  }

  let riskSeviyesi = 'Düşük';
  let öneri = 'Değerleriniz genel olarak normal aralıktadır.';

  if (riskScore >= 3 && riskScore <= 5) {
    riskSeviyesi = 'Orta';
    öneri = 'Bazı değerler sınır dışıdır. Takip ve yaşam tarzı düzenlemesi önerilir.';
  }

  if (riskScore > 5) {
    riskSeviyesi = 'Yüksek';
    öneri = 'Birden fazla anormal değer var. Doktora başvurmanız önerilir.';
  }

  return {
    analiz,
    öneri,
    riskSeviyesi,
  };
};
