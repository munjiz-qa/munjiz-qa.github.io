# يجهّز مشروع أندرويد بعد «npx cap add android»: الأذونات، الأيقونات، الاسم، والتوقيع.
import os, re, shutil, sys
A = 'android'
m = open(f'{A}/app/src/main/AndroidManifest.xml').read()
perms = ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'WAKE_LOCK']
add = ''.join(f'    <uses-permission android:name="android.permission.{p}" />\n' for p in perms if p not in m)
add += '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n'
m = m.replace('</manifest>', add + '</manifest>')
m = m.replace('<application', '<application android:supportsRtl="true"', 1) if 'supportsRtl' not in m else m
m = re.sub(r'android:screenOrientation="[^"]*"', '', m)
m = m.replace('android:theme="@style/AppTheme.NoActionBarLaunch"', 'android:theme="@style/AppTheme.NoActionBarLaunch" android:keepScreenOn="true"') if 'keepScreenOn' not in m else m
open(f'{A}/app/src/main/AndroidManifest.xml', 'w').write(m)
# icons
res = f'{A}/app/src/main/res'
for root, _, files in os.walk('android-res/res'):
    for f in files:
        dst = os.path.join(res, os.path.relpath(root, 'android-res/res'))
        os.makedirs(dst, exist_ok=True); shutil.copy(os.path.join(root, f), dst)
# app name
sx = f'{res}/values/strings.xml'; s = open(sx).read()
s = re.sub(r'<string name="app_name">[^<]*</string>', '<string name="app_name">مشوار</string>', s)
s = re.sub(r'<string name="title_activity_main">[^<]*</string>', '<string name="title_activity_main">مشوار</string>', s)
open(sx, 'w').write(s)
# version + signing
v_code, v_name = sys.argv[1], sys.argv[2]
g = open(f'{A}/app/build.gradle').read()
g = re.sub(r'versionCode \d+', f'versionCode {v_code}', g)
g = re.sub(r'versionName "[^"]*"', f'versionName "{v_name}"', g)
sign = '''
    signingConfigs {
        release {
            storeFile file(System.getenv("MISHWAR_KEYSTORE"))
            storePassword System.getenv("MISHWAR_KEY_PASS")
            keyAlias System.getenv("MISHWAR_KEY_ALIAS")
            keyPassword System.getenv("MISHWAR_KEY_PASS")
            storeType "pkcs12"
        }
    }
'''
g = g.replace('    buildTypes {', sign + '    buildTypes {', 1)
g = re.sub(r'(release \{\s*\n\s*minifyEnabled false)', r'\1\n            signingConfig signingConfigs.release', g, 1)
open(f'{A}/app/build.gradle', 'w').write(g)
print('patched', v_code, v_name)
