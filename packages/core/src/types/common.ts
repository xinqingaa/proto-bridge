export type TargetPlatform = 'flutter';

export type PageType = 'prototype' | 'design';

export type ImplementationShape = 'StatelessWidget' | 'StatefulWidget' | 'TargetPagePattern';

export type WidgetRecommendationType = 'page' | 'section' | 'component' | 'sheet' | 'dialog';

export type MappingConfidence = 'high' | 'medium' | 'low';

export type AdapterProjectConfig = {
  adapter: string;
  root: string;
};
