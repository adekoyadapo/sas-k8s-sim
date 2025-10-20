{{- define "tenant-nginx.fullname" -}}
{{- if .Values.nameOverride -}}
{{- .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- include "tenant-nginx.name" . -}}
{{- end -}}
{{- end -}}

{{- define "tenant-nginx.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
