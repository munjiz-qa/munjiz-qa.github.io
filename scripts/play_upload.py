"""Upload a signed AAB to Google Play through the Android Publisher API.
Usage: play_upload.py AAB PACKAGE TRACK STATUS  (service account JSON in env PLAY_SERVICE_ACCOUNT_JSON)."""
import json, os, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

aab, package, track, status = sys.argv[1:5]
info = json.loads(os.environ["PLAY_SERVICE_ACCOUNT_JSON"])
creds = service_account.Credentials.from_service_account_info(
    info, scopes=["https://www.googleapis.com/auth/androidpublisher"])
svc = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)
edits = svc.edits()
edit = edits.insert(packageName=package, body={}).execute()
eid = edit["id"]
bundle = edits.bundles().upload(
    packageName=package, editId=eid, media_body=MediaFileUpload(aab, mimetype="application/octet-stream")).execute()
code = bundle["versionCode"]
print("uploaded versionCode", code)
release = {"name": f"1.0.{code}", "versionCodes": [str(code)], "status": status,
           "releaseNotes": [
               {"language": "ar", "text": "الإصدار الأول من تطبيق مشكاة."},
               {"language": "en-US", "text": "The first release of Mishkat."}]}
edits.tracks().update(packageName=package, editId=eid, track=track,
                      body={"track": track, "releases": [release]}).execute()
edits.commit(packageName=package, editId=eid).execute()
print(f"committed to track={track} status={status}")
