# Google Sheets + Apps Script Kurulumu

## 1. Google Sheets Oluştur

1. [sheets.google.com](https://sheets.google.com) → Yeni e-tablo oluştur
2. Adını "KPSS Tarih - User Progress" yap
3. İlk sheet'i "UserProgress" olarak yeniden adlandır
4. İlk satıra (header) şu kolonları ekle:
   ```
   userId | displayName | xp | level | badges | completedSubtopics | streak | accuracy | timestamp
   ```

## 2. Apps Script Ekle

1. Sheets içinde: **Uzantılar (Extensions)** → **Apps Script**
2. Açılan editörde varsayılan kodu sil
3. Aşağıdaki kodu yapıştır:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('UserProgress');

  if (data.action === 'saveProgress') {
    const rows = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.userId) {
        rowIndex = i + 1;
        break;
      }
    }

    const rowData = [
      data.userId,
      data.displayName,
      data.xp,
      data.level,
      JSON.stringify(data.badges),
      data.completedSubtopics,
      data.streak,
      data.accuracy,
      data.timestamp
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (data.action === 'backupContent') {
    let backupSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ContentBackup');
    if (!backupSheet) {
      backupSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('ContentBackup');
      backupSheet.appendRow(['content', 'timestamp']);
    }
    backupSheet.getRange(2, 1, 1, 2).setValues([[data.content, data.timestamp]]);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getLeaderboard') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('UserProgress');
    const rows = sheet.getDataRange().getValues();
    const limit = parseInt(e.parameter.limit) || 10;

    const leaderboard = rows.slice(1)
      .map(row => ({
        userId: row[0],
        displayName: row[1],
        xp: row[2],
        level: row[3]
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return ContentService.createTextOutput(JSON.stringify({ leaderboard }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getContentBackup') {
    const backupSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ContentBackup');
    if (!backupSheet) {
      return ContentService.createTextOutput(JSON.stringify({ content: null }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const content = backupSheet.getRange(2, 1).getValue();

    return ContentService.createTextOutput(JSON.stringify({ content }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy Et

1. Sağ üstte **Dağıt (Deploy)** → **Yeni dağıtım (New deployment)**
2. Tür seç: **Web App**
3. Ayarlar:
   - **Execute as:** Me
   - **Who has access:** Anyone (herkes erişebilsin, anonim kullanıcı verisi için gerekli)
4. **Dağıt (Deploy)** tıkla
5. İzin ver (Authorize access) — Google hesabınla onaylaman gerekecek
6. Sana verilen **Web App URL**'ini kopyala
   ```
   https://script.google.com/macros/s/XXXXXXXXXXXXX/exec
   ```

## 4. URL'i Config'e Ekle

`config.js` dosyasında:

```javascript
GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/XXXXXXXXXXXXX/exec',
```

## 5. Test Et

Tarayıcıdan şu URL'i ziyaret et (leaderboard test):
```
https://script.google.com/macros/s/XXXXXXXXXXXXX/exec?action=getLeaderboard
```

Eğer `{"leaderboard":[]}` gibi bir JSON dönüyorsa, kurulum başarılı! ✅

## Notlar

- Apps Script'i her kod değişikliğinde **yeniden deploy** etmen gerekir (Dağıt → Dağıtımları Yönet → Düzenle → Yeni versiyon)
- Sheets verisi gerçek zamanlı görüntülenebilir, manuel düzenleme yapılabilir
- Ücretsiz kotaya tabidir (günlük ~20,000 istek, kişisel kullanım için fazlasıyla yeterli)
