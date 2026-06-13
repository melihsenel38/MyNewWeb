# Firebase Kurulum

Bu site kartlari Firestore'da saklar. Firebase Storage ucret istedigi icin fotograf yukleme yerine kartlara fotograf linki eklenir.

## 1. Firebase projesi ac

1. https://console.firebase.google.com adresine gir.
2. Yeni bir proje olustur.
3. Project settings > Your apps bolumunden Web app ekle.
4. Firebase config objesindeki bilgileri kopyala.
5. `outputs/firebase-config.js` dosyasindaki `BURAYA_...` alanlarini bu bilgilerle degistir.

## 2. Firestore ac

Firestore Database olustur ve Rules kismina bunu koy:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /memoryCards/{cardId} {
      allow read, create: if true;
      allow update, delete: if false;
    }

    match /loveNotes/{noteId} {
      allow read, create: if true;
      allow update, delete: if false;
    }
  }
}
```

## 3. Fotograf ekleme

Storage gerekmez. Kart eklerken fotograf linki alanina internette acilabilen bir gorsel URL'si gir.

Site internete acilacaksa daha sonra giris sistemi ekleyip yazma iznini sadece size kapatmak daha guvenli olur.
