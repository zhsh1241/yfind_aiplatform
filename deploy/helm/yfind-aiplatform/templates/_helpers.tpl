{{- define "yfind-aiplatform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "yfind-aiplatform.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "yfind-aiplatform.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
