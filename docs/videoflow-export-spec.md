# VideoFlow 연동용 데이터 내보내기 규격서 (Export Specification)

본 문서는 MemoryFlow 애플리케이션에서 완료된 스토리북을 기반으로 내보낸 **영상 제작용 패키지**의 파일 구조 및 데이터 상세 스펙을 정의합니다. `VideoFlow` 비디오 렌더러 및 렌더링 파이프라인 개발 시 참조 자료로 활용합니다.

---

## 1. 패키지 파일 구조 (Directory Structure)

MemoryFlow에서 프로젝트의 내보내기를 실행하면, 서버 저장소의 `outputs/export-{ISO타임스탬프}/` 하위에 다음과 같은 구조의 파일 패키지가 생성됩니다.

```text
export-YYYY-MM-DDTHH-MM-SS-MSZ/
├── project.json            # 프로젝트 기본 정보 (영상 메타데이터)
├── scene-timeline.json     # 핵심 장면별 타임라인 대본 및 미디어 매핑 데이터
└── media/                  # 실제 사진 및 비디오 자산이 모여 있는 폴더
    ├── {media_id}_{원본파일명}.jpg
    ├── {media_id}_{원본파일명}.mp4
    └── ...
```

---

## 2. 상세 파일 스펙

### 📄 1) `project.json`
영상의 타이틀, 설명 및 인트로/아웃트로 커버 이미지 등 전반적인 프로젝트 레벨의 정보를 담고 있는 메타데이터 파일입니다.

* **파일 경로**: `project.json`
* **JSON 필드 설명**:
  * `id` (number): 프로젝트의 고유 식별자.
  * `name` (string): 프로젝트 이름 (영상의 메인 타이틀 텍스트로 활용).
  * `org_name` (string | null): 소속 또는 단체명 (인트로 부제목 텍스트 등으로 활용).
  * `description` (string | null): 프로젝트 소개 및 요약글.
  * `start_date` (string): 프로젝트 시작일 (YYYY-MM-DD).
  * `end_date` (string): 프로젝트 종료일 (YYYY-MM-DD).
  * `default_photo_seconds` (number): 프로젝트 전체 기본 사진 한 장당 노출 시간 (초 단위).
  * `cover_image_path` (string | null): 인트로 타이틀 화면용 대표 커버 이미지 상대 경로.
  * `exported_at` (string): 패키지 파일 내보내기 실행 시각 (ISO 8601).

* **JSON 데이터 예시**:
```json
{
  "id": 1,
  "name": "여름 수련회 2026",
  "org_name": "햇살교회 청년부",
  "description": "2박 3일 여름 수련회 기록",
  "start_date": "2026-07-15",
  "end_date": "2026-07-17",
  "default_photo_seconds": 3,
  "cover_image_path": "projects/1/uploads/cover.jpg",
  "exported_at": "2026-06-11T13:32:45.000Z"
}
```

---

### 📄 2) `scene-timeline.json`
비디오 생성기(렌더러)가 읽어 들여 **오디오(TTS) 음성을 합성하고 영상 트랙(사진/비디오)의 타임라인을 배열하는 핵심 데이터 파일**입니다. 각 세부일정(`schedule`)이 비디오의 한 **장면(Scene)**이 됩니다.

* **파일 경로**: `scene-timeline.json`
* **JSON 필드 설명**:
  * `project_id` (number): 해당 프로젝트 고유 식별자.
  * `total_seconds` (number): 모든 장면의 재생 시간(`scene_seconds`)을 합산한 비디오의 총 예상 길이 (초 단위).
  * `scenes` (array): 비디오 장면 목록 배열.
    * `schedule_id` (number): 장면의 기준이 되는 세부 일정 ID.
    * `day_index` (number): 몇 번째 날(Day)에 해당하는지 나타내는 인덱스 (화면 전환 자막용).
    * `title` (string): 세부 일정의 제목 (장면 자막용).
    * `time` (string | null): 일정이 진행된 시각 (예: "14:00").
    * `place` (string | null): 일정이 진행된 장소 (예: "대강당").
    * `photo_seconds` (number): 이 장면에 속한 사진 1장이 머무를 시간 (초).
    * `scene_seconds` (number): **이 장면의 총 렌더링 시간 (초)**. (사진 수 × 노출 시간 + 포함된 영상 클립의 길이)
    * `narration` (string): **해당 장면에 들어갈 TTS 음성 합성 및 화면 하단 자막(Subtitle)용 내레이션 텍스트**.
    * `media` (array): 해당 장면에 포함된 사진 및 동영상 리소스 정보 배열.
      * `id` (number): 미디어 자산 고유 ID.
      * `type` (string): 미디어 자산의 유형 (`photo` 또는 `video`).
      * `file` (string): `media/` 디렉터리에 복사되어 위치한 자산 파일의 상대 경로.
      * `duration_seconds` (number): **해당 자산이 화면에 노출될 시간 (초)**. (타입이 `photo`인 경우 장면의 `photo_seconds`가 매핑되며, `video`인 경우 동영상 원본 클립 자체의 재생 시간 매핑)

* **JSON 데이터 예시**:
```json
{
  "project_id": 1,
  "total_seconds": 23,
  "scenes": [
    {
      "schedule_id": 10,
      "day_index": 1,
      "title": "입소 및 오리엔테이션",
      "time": "14:00",
      "place": "대강당",
      "photo_seconds": 3,
      "scene_seconds": 14,
      "narration": "드디어 여름 수련회가 시작되었습니다. 대강당에 모두 모여 기대하는 마음으로 오리엔테이션에 임했습니다.",
      "media": [
        {
          "id": 15,
          "type": "photo",
          "file": "media/15_photo.jpg",
          "duration_seconds": 3
        },
        {
          "id": 16,
          "type": "video",
          "file": "media/16_clip.mp4",
          "duration_seconds": 8
        },
        {
          "id": 17,
          "type": "photo",
          "file": "media/17_photo.jpg",
          "duration_seconds": 3
        }
      ]
    }
  ]
}
```

---

### 📂 3) `media/` 폴더
* 관리자가 최종 선별 완료한(`included === true`) 리소스(사진 및 영상 클립)들만 복사되어 담겨 있는 디렉터리입니다.
* 여러 업로더가 각자 올린 파일명의 충돌을 미연에 방지하기 위해, 파일명은 `{media_id}_{원본파일명}` 형식으로 안전하게 재정의되어 저장됩니다.
* 비디오 렌더러는 `scene-timeline.json` 파일 내의 `media[].file` 경로를 탐색해 미디어 자산을 읽고 영상의 각 프레임에 입힙니다.

---

## 3. VideoFlow 렌더러 개발 시 구현 가이드

1. **타임라인 트랙 구축**:
   * `scene-timeline.json`의 `scenes` 배열을 차례대로 루프(순회) 돌며 비디오 씬을 얹습니다.
   * 각 장면(Scene) 내부의 `media` 배열 순서대로 리소스를 로드하여 `type: "photo"`는 `duration_seconds`초 동안 켄번(Ken Burns) 효과 등 모션을 주어 렌더링하고, `type: "video"`는 클립을 그대로 재생합니다.
2. **오디오(내레이션) 및 자막 매핑**:
   * 각 씬의 `narration` 텍스트를 TTS 엔진에 전송해 음성을 생성하고, 장면의 시작점에 맞추어 배경음(오디오 트랙)으로 렌더링합니다.
   * 음성 합성 속도와 자막 싱크를 맞추어 화면 하단에 자막 오버레이를 표시합니다.
3. **대표 타이틀 및 화면 전환**:
   * 장면 전환 시 `day_index`, `title`, `time`, `place` 정보를 바탕으로 화면 타이틀 카드나 전환 자막 그래픽을 얹으면 비디오의 완성도를 높일 수 있습니다.
