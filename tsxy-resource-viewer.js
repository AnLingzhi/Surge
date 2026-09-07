/**
 * Surge 资源解锁与解析重写脚本 (终极全量版)
 * 特性: 内置全分类 177 门课程全量 MP3 映射 (0延迟秒开) + 动态增量自学习 + Token 自动同步
 */
(function () {
  var FILE_ORIGIN = "https://file.tsxyapp.com";
  var ADMIN_REPORT_LIST = "http://admin.tsxyapp.com/api/report/list";
  var ADMIN_COURSE_LIST = "http://admin.tsxyapp.com/api/course/list";
  var WORKER_TOKEN_SYNC_URL = "https://tsxy.xai-kg.workers.dev/api/update-token-by-surge";
  var PERSIST_CATALOG_KEY = "tsxy_resource_catalog_v3";
  var PERSIST_AUDIO_MAP_KEY = "tsxy_audio_uuid_mapping_v3";

  // 内置全量 177 门课程 (含基础课、专栏课、行业板块课) 的真实 .mp3 纯音频直链映射表
  var SEED_AUDIO_MAP = {
  "55c2dc3c-90bb-4213-b43d-a6954ba6095b": "https://file.tsxyapp.com/audio/1aa0632e-d061-4461-b678-482edd089826.mp3?v=34&sign=091afbbb959065174785309516ad4505&t=6a9c0b80",
  "6b642b6b-ea98-424e-8a72-bc7bd5d9fc7e": "https://file.tsxyapp.com/audio/757076e0-d165-4396-b06b-85a3ed4638f2.mp3?v=34&sign=4fbf58054f12eb3a2d0cb805aeedba9d&t=6a9c0b80",
  "a1653b0c-6e3d-48fc-a7ed-f83340423aaa": "https://file.tsxyapp.com/audio/8aab6108-7b8c-417f-a736-b387a1e3d25a.mp3?v=34&sign=581d69ab97ed87ec65802e4334faff97&t=6a9c0b80",
  "9774b2e0-4183-4412-b7c0-595fb8d08780": "https://file.tsxyapp.com/audio/31159832-19b6-420b-88df-9f96e556a8ec.mp3?v=34&sign=726728f15c5e1b914616a3eb76c5601a&t=6a9c0b80",
  "5603283f-6873-4caa-968d-2530eac09577": "https://file.tsxyapp.com/audio/a1cf5ee1-c67e-4972-864e-90c598361114.mp3?v=34&sign=8b856c8143576c3b80dfb0ed158e217e&t=6a9c0b80",
  "53b54863-dab5-4bc6-ae34-f68e8ba1500c": "https://file.tsxyapp.com/audio/9232354f-6862-41ae-a267-d378809543ed.mp3?v=34&sign=6caefe89e29619e01a7f69bd2b949c01&t=6a9c0b80",
  "3dcf1b53-b6b0-4b53-bb5a-980a023bf6b6": "https://file.tsxyapp.com/audio/1d7c9f96-6989-418d-8838-30c3e68d8f84.mp3?v=34&sign=dfd8073874208480f1b990820fc4d3b2&t=6a9c0b80",
  "4273d0f0-9707-43ad-ad44-7b7e56fa75bd": "https://file.tsxyapp.com/audio/dd86f539-3ece-4a90-934a-91b94a4be2b9.mp3?v=34&sign=4594ea17f01e4ac3f988715d95774ea3&t=6a9c0b80",
  "1d527e17-a16e-4686-b5c8-0f8b50d403f2": "https://file.tsxyapp.com/audio/4937f365-ae17-4dce-ab22-80fc5f80a36d.mp3?v=34&sign=95b207d2fcb9667c0ed19f7f0235350a&t=6a9c0b80",
  "095a1ff7-6db9-4a84-917a-4c8ee98efe18": "https://file.tsxyapp.com/audio/1886ad30-f95b-4dde-abde-839b6f7d176e.mp3?v=34&sign=9a9e56b8895818696bd51887ffe2abe1&t=6a9c0b80",
  "00d8e6fb-b6b0-4ae2-9200-2b8e72fb56ab": "https://file.tsxyapp.com/audio/32b9432b-e220-49ed-8137-cf93c0514099.mp3?v=34&sign=51149a9d702ef42be7a00745b3217d4c&t=6a9c0b80",
  "e36aa954-0163-47ce-8882-96746b03fa2f": "https://file.tsxyapp.com/audio/e25dd465-3e8b-4626-9399-86506477110f.mp3?v=34&sign=654525cb45545cf3bb07e738fd38dbc7&t=6a9c0b80",
  "830f9982-cef9-47da-91e3-be5eab476115": "https://file.tsxyapp.com/audio/7a6033a0-afd2-4dc6-aa0d-29b622e359ac.mp3?v=34&sign=935ce8ac5cc1a1b26818cc8a100e64ca&t=6a9c0b80",
  "07985abc-064d-442c-b00b-77a48c0cb9b1": "https://file.tsxyapp.com/audio/a9feca15-b8f3-4f74-86f6-0060ebfe9a3d.mp3?v=34&sign=d3c7147ef4c065e2e9fdda4b88d645ee&t=6a9c0b80",
  "b6bf4bd2-1599-44ec-9a55-ebc93405894f": "https://file.tsxyapp.com/audio/bd261646-464e-4342-b0ad-f6a7313d192a.mp3?v=34&sign=65fe1db5824339944da3771efefbd9f9&t=6a9c0b80",
  "d388dfca-0175-44f8-a556-e87115995d42": "https://file.tsxyapp.com/audio/dc5ff398-6c32-4d3b-bb9a-b57bbdf4159e.mp3?v=34&sign=a5ccd6406ee3b49eac9518e6ddb9259d&t=6a9c0b80",
  "6131d903-b168-42b9-9fac-014e3708d0b1": "https://file.tsxyapp.com/audio/d6b510c5-c1fc-46d9-b5e0-b49b8f264b49.mp3?v=34&sign=e80699a96446e443948007cab6a86779&t=6a9c0b80",
  "638cf985-90a5-4542-af29-20df25b60c5b": "https://file.tsxyapp.com/audio/48931d8e-f7c3-49b9-8c32-0db938594abc.mp3?v=34&sign=12db08068b7a0ff67337b9b1da7c2730&t=6a9c0b80",
  "33113f5a-3486-45d4-89ce-8b59ad6db189": "https://file.tsxyapp.com/audio/1db3a219-b469-4394-9e4b-65e257873288.mp3?v=34&sign=cb5bedf2dfee3931a89cbbc8de78a50e&t=6a9c0b80",
  "2eeb4ebd-0d8c-4081-9675-5dad6cda46b1": "https://file.tsxyapp.com/audio/22402ea8-e3f8-4165-8be0-1ffd18bba725.mp3?v=34&sign=aeec3eef82ddbe7c2bb6d7c7f8c2bb95&t=6a9c0b80",
  "7346063b-2746-4e02-9b85-8e308d3f548a": "https://file.tsxyapp.com/audio/68da8719-ee10-4f6d-be70-20c6114607cf.mp3?v=34&sign=f22128de2219fc56352c59402905eba4&t=6a9c0b81",
  "626940fa-f7ee-4318-8032-774cd72d0bc7": "https://file.tsxyapp.com/audio/b1494b8d-b35b-4640-a7d0-4de8ccb1dbd2.mp3?v=34&sign=e0d59c35fb6a991d5d4503d35b86712c&t=6a9c0b81",
  "07ec4a45-1086-463a-b312-6921318e7d14": "https://file.tsxyapp.com/audio/4126a9ce-1708-40f5-8c45-f49faca44586.mp3?v=34&sign=8f169bf872c7cfa6d8ccfb6edfe5de2d&t=6a9c0b81",
  "582109d4-a248-4e12-8852-8110fac7cefb": "https://file.tsxyapp.com/audio/8c300729-ec27-4435-b876-7c4f5ec5396f.mp3?v=34&sign=481bb4e9c9fe198691f290c3fc3ad4a0&t=6a9c0b81",
  "9c3d46d2-563b-4f6e-97ef-fd4c5807b507": "https://file.tsxyapp.com/audio/4ec39992-b2d7-4b94-8ea4-182e6954384b.mp3?v=34&sign=ff14b119822a43c2fb194bddc0b9533f&t=6a9c0b81",
  "b2e4188e-d055-4119-9de6-c4abfa5992bd": "https://file.tsxyapp.com/audio/83f3f352-7933-437f-9dca-3c4900bbf73a.mp3?v=34&sign=50a2ddd515b773a0c504b872cfcd60b0&t=6a9c0b81",
  "d7748d03-7b86-4568-941e-97c4d1ef64c2": "https://file.tsxyapp.com/audio/19ed2922-25af-417b-81da-2458326b454f.mp3?v=34&sign=9eeb059b40caca9235f04c8398c15952&t=6a9c0b81",
  "e0a3ff09-f882-4c6f-a332-4815a84bfa7d": "https://file.tsxyapp.com/audio/9ba5d364-a617-4c08-bc06-fbd57e740706.mp3?v=34&sign=54c2b27d19c56ab5541b651f8069027d&t=6a9c0b81",
  "63a6a353-3866-4ca7-aa46-9ea791340247": "https://file.tsxyapp.com/audio/de145f40-63a2-4c09-a350-3c2cdda48e93.mp3?v=34&sign=b046fad88225dcd3fa286b69e9d4114b&t=6a9c0b81",
  "5ca6ba6b-ae9f-476d-b9f5-c23e29729394": "https://file.tsxyapp.com/audio/218c4423-9819-4ee4-a630-597ec80851b0.mp3?v=34&sign=05ffc6e0b06d1f9db51b2cb7d581c2a0&t=6a9c0b81",
  "12e29095-6c38-44a9-8c98-9c6c57387bfd": "https://file.tsxyapp.com/audio/890caa7e-e09c-4f64-976d-5f60efec6442.mp3?v=34&sign=a318e4f48e7291be7192fd5e8ec54c52&t=6a9c0b81",
  "5937bb17-0fbd-4310-a0fb-6f8ac7c2e83f": "https://file.tsxyapp.com/audio/f44644ae-9d70-448f-8663-09975404530f.mp3?v=34&sign=7ae6fb5caa2d30408eab564c2908d637&t=6a9c0b81",
  "e998edf5-d301-40ec-8a5c-fe430538c5a2": "https://file.tsxyapp.com/audio/840d3f02-691f-4248-8270-5cb699cd01a8.mp3?v=34&sign=8fb5d6922655def718fa93128540253f&t=6a9c0b81",
  "faf5742e-6f14-43d3-b26b-d630d1b47156": "https://file.tsxyapp.com/audio/c37710ec-2131-4371-841c-b1edd12a59b1.mp3?v=34&sign=01c417023307059fd24b27ad11e641ef&t=6a9c0b81",
  "14dc3c84-e86b-48bf-9dad-704215b8f16e": "https://file.tsxyapp.com/audio/9fa42cb8-834a-4a6f-94ec-84f8ff2fdc21.mp3?v=34&sign=6bac51f04760581799a388a605ef8f36&t=6a9c0b81",
  "d6dec68d-d57e-41a8-ba8c-ceb4f1d1c9f9": "https://file.tsxyapp.com/audio/32ba6176-f46b-4f85-84b5-2e190f79d38d.mp3?v=34&sign=9b4bd8fb205b75c6e48d6c89303b43cb&t=6a9c0b81",
  "8b3230c7-e896-4954-8749-625b5765def0": "https://file.tsxyapp.com/audio/f993e245-f23a-4166-96b4-89b545da3b04.mp3?v=34&sign=a0c4b263458adab211a2bbc0c812188d&t=6a9c0b81",
  "ff79fe56-5d7a-4343-8e9f-a5cc03fcb392": "https://file.tsxyapp.com/audio/1c8d2e38-bfca-4d3c-b9b8-3947cb11b6ea.mp3?v=34&sign=e0e65537b5a88b5c33d3dde3528bcb57&t=6a9c0b81",
  "6278c363-6c0b-4746-9f6f-8166116123b3": "https://file.tsxyapp.com/audio/214d0fe9-01d5-41d3-af62-5268a67589e5.mp3?v=34&sign=b01ccdb76a82bf58b224f75835630032&t=6a9c0b81",
  "8b5695f7-b8a2-407d-8971-c2a8deb11cc1": "https://file.tsxyapp.com/audio/016ae167-eff8-45b1-ab25-d00966e0c21a.mp3?v=34&sign=7a8d05b187c3f0757e96fb35ff95f338&t=6a9c0b81",
  "d98843c8-e89d-44ce-8f8b-655e6f5c73ed": "https://file.tsxyapp.com/audio/6a490eee-ea94-41fa-a954-801c48a4a404.mp3?v=34&sign=e2fbab33d598a7cfebb38ec520d8b3d4&t=6a9c0b81",
  "cb46ab50-14cc-4c22-bdf5-2dc8b807bc20": "https://file.tsxyapp.com/audio/7cc9a179-04cd-405a-b28f-1a6bb575f9bd.mp3?v=34&sign=6b95be12c264d4e953ff0660a4e6bdc7&t=6a9c0b81",
  "394d2b28-b849-4d02-be80-20a9d98552e2": "https://file.tsxyapp.com/audio/9b961647-04aa-4377-9b05-af060ea0699d.mp3?v=34&sign=070a7339babcfa370af33ffc3894852d&t=6a9c0b81",
  "773c2cea-0171-4487-968e-e360e217f5a0": "https://file.tsxyapp.com/audio/ac88fbac-aad8-481b-8e1d-622fd55fb0fc.mp3?v=34&sign=780b7e9220d8c88246bb81e062191a8c&t=6a9c0b81",
  "d6f6a651-881f-480e-bb88-c35e09313a03": "https://file.tsxyapp.com/audio/57c7ba14-fcf4-4fa9-833b-d66ea41bb30b.mp3?v=34&sign=94c6dba594d36495395e5abcc8e4f90e&t=6a9c0b81",
  "95da898e-9ca3-486f-8e26-a6c7f0acccf5": "https://file.tsxyapp.com/audio/20428472-89c7-40bc-90b6-67e3b845c90f.mp3?v=34&sign=868e3eca84e0b19e57dd84d44221327e&t=6a9c0b81",
  "f3a8df02-0fc6-44e1-897d-750e9f9f2f1c": "https://file.tsxyapp.com/audio/08f4aa2b-17f8-4062-8030-d29e878188c4.mp3?v=34&sign=9ab52e3f41c5d7201105f3073f452005&t=6a9c0b81",
  "c15318f4-d904-4ca1-aa13-c296f6780186": "https://file.tsxyapp.com/audio/e3868310-e759-49b1-ac31-38070a457bea.mp3?v=34&sign=f1976a4a982004f99040f3ba10448433&t=6a9c0b81",
  "d61b14a2-4ef0-4fd6-bef4-e58dc52eb16f": "https://file.tsxyapp.com/audio/ed9414dc-fad2-4dec-a4ee-883d3cc5509e.mp3?v=34&sign=ff09c6738a5ef2528adf7179fe91f9a3&t=6a9c0b81",
  "6cf47732-464f-4e04-8450-453274c7939c": "https://file.tsxyapp.com/audio/ddb4ce0d-5110-41c2-81dc-7f2bf4ae2439.mp3?v=34&sign=10516d50b340646d0afa4d2f89df14e4&t=6a9c0b81",
  "1d9e8141-dc0f-4574-9354-7fb8dcc9f04e": "https://file.tsxyapp.com/audio/9f2c8749-ab7e-4857-a8e3-e6b77d97a5de.mp3?v=34&sign=483488d553f9a54af3627d7d3c542019&t=6a9c0b81",
  "3999b062-aa30-49dd-92c2-0a4420d28477": "https://file.tsxyapp.com/audio/3bedb7f4-b819-4b03-9f9b-f4c64d191f04.mp3?v=34&sign=7ef9ab105edbd28112f4d9c06e70fe2d&t=6a9c0b81",
  "964d42bd-8c70-41c3-b37e-6790baaecbf0": "https://file.tsxyapp.com/audio/90821986-08a8-4d04-88dd-ed1db604172d.mp3?v=34&sign=21398f73076abd659cb45aeb58984bed&t=6a9c0b81",
  "c463701e-6d7c-4969-9788-e4ebb50149c8": "https://file.tsxyapp.com/audio/1efce6c3-02a2-4c6e-a90f-00f49932cb67.mp3?v=34&sign=f4001a5aab3877b3297e4790f634c761&t=6a9c0b81",
  "a1925d29-5fdf-42a4-811d-5831812bdff6": "https://file.tsxyapp.com/audio/7e8282af-b66f-4a51-a3bc-24e0e775ec88.mp3?v=34&sign=89730a1f22dc6cea74ef66903aa0d217&t=6a9c0b81",
  "15c41d8c-574a-44cc-86aa-f454384545ee": "https://file.tsxyapp.com/audio/414d74de-7eb7-4be5-b1d2-9eb5c3509277.mp3?v=34&sign=310db52c55450f4070f02d138f7b4fd7&t=6a9c0b81",
  "a67db420-7248-417e-b79b-69f7f0a13e7a": "https://file.tsxyapp.com/audio/8941d092-4b03-4ba5-a335-9323fe58fe47.mp3?v=34&sign=2a119e7c4634298d1203fa13e6993bd8&t=6a9c0b81",
  "6028f8b7-bdff-46bb-877c-641ae95b97de": "https://file.tsxyapp.com/audio/64626aef-cf75-4eb0-8bae-ce0ccaaf7060.mp3?v=34&sign=fea2c28eb3107b51f4ceb9a53e5568b7&t=6a9c0b81",
  "3922c3a6-017e-46ea-8e30-dd8c273f0afb": "https://file.tsxyapp.com/audio/8adc830a-ac32-4926-a502-ac76be3a74b5.mp3?v=34&sign=a896351143f0fe663c996517d31fcb93&t=6a9c0b81",
  "eddcf26b-5577-4f7a-be6d-c6d41491fb91": "https://file.tsxyapp.com/audio/62c4b6d8-55f3-4ea1-a26d-bf80bb730d8b.mp3?v=34&sign=37391341b7b3fc579bf5e232c624bb99&t=6a9c0b81",
  "d5167813-c11c-4b44-8355-3636c68a4547": "https://file.tsxyapp.com/audio/35e8593e-8570-477b-bad9-799e2c0ae053.mp3?v=34&sign=000c1ef62edd3ddf66056c2b6fcd3951&t=6a9c0b81",
  "bb8705d2-2af0-422e-b753-06706ece6ca7": "https://file.tsxyapp.com/audio/e8a65257-8cbc-4711-8d5b-7aa5b7bc7ea3.mp3?v=34&sign=702fc2caf47c94473df441517a373c25&t=6a9c0b81",
  "e41bdb1a-8537-4c1a-8f59-c4ae4af1e164": "https://file.tsxyapp.com/audio/f789df93-a16c-4143-bab1-3be588a09fad.mp3?v=34&sign=5b2fe78baaec4f00039b21030f1f1a8c&t=6a9c0b81",
  "690bb0ea-85c1-4e3a-a9d0-b4fb98566cd5": "https://file.tsxyapp.com/audio/817d825b-022a-44df-b21f-128cd3b2218a.mp3?v=34&sign=b20f0a124e9071b8e7de6443d3c4de61&t=6a9c0b81",
  "dd2eb390-c300-48b7-a511-0c94948fa707": "https://file.tsxyapp.com/audio/1de1a597-bbac-425e-83d6-799eb58b4408.mp3?v=34&sign=879532dea03f3cce91e235289649576e&t=6a9c0b81",
  "1f547843-2c65-49ea-9f87-99f8e40abbf7": "https://file.tsxyapp.com/audio/f8398d88-6abd-493e-9f42-84d04b4a14be.mp3?v=34&sign=dca5f6b659b7cbbfc23c9efd93776fbe&t=6a9c0b81",
  "8ea203df-9bcf-4d0b-8f3f-c04cddbb6717": "https://file.tsxyapp.com/audio/5962aaed-8afa-46cb-95b7-8f8ea01e0490.mp3?v=34&sign=4bc60d4f43ebc648871d8a307744ce5b&t=6a9c0b81",
  "95971f74-640c-4c3f-bce7-3d153efc6887": "https://file.tsxyapp.com/audio/81c6cfd8-4b70-4d4b-bf69-d34414374eb7.mp3?v=34&sign=d32de9c0e49ba56597ee9214cd7177af&t=6a9c0b81",
  "b2fb811d-fbe2-4d27-b9b4-88a61fd22f66": "https://file.tsxyapp.com/audio/40a6ff95-f9d1-4bad-a441-5494bb558695.mp3?v=34&sign=cfd9ca2ec1fcb61b21b33ebba7f478b9&t=6a9c0b81",
  "39954356-db76-425b-8dc2-546d40911975": "https://file.tsxyapp.com/audio/12221a23-e85c-412e-948c-1dc0438ca35f.mp3?v=34&sign=10769dbea2a6cb76d3bc07865125832d&t=6a9c0b81",
  "e4632ec4-32bb-4a15-9571-409a0597ee78": "https://file.tsxyapp.com/audio/8ca7fb58-7bf1-4777-a412-cbdf90629a24.mp3?v=34&sign=be6ea2cb4bb320cc1280a90b2db1fb98&t=6a9c0b81",
  "0491a403-526b-4627-ac9e-5be65efe5c3f": "https://file.tsxyapp.com/audio/96b0fe52-faac-4b60-8524-432f41ecf149.mp3?v=34&sign=a52d7fdd96ea49ad9007bf8831c82e31&t=6a9c0b81",
  "64686df8-1c38-442a-ae3a-2a9400287d16": "https://file.tsxyapp.com/audio/bb0363b2-fef3-4808-a57a-454a442f321e.mp3?v=34&sign=67c8af99e22bf8f40afc89dcc1cbcd76&t=6a9c0b81",
  "ad0b51cc-8eed-4c97-a8e8-93dd8f74c2fa": "https://file.tsxyapp.com/audio/e14e03cc-cc82-40a7-8400-a5fd7cf9377d.mp3?v=34&sign=01b6f30808199e6cab5b6ec6bad3be2e&t=6a9c0b81",
  "78cd7f6e-d305-4ae7-980f-95d25c21498a": "https://file.tsxyapp.com/audio/184f53fc-a1f5-48f9-9f56-c3c0b440f657.mp3?v=34&sign=e90738d0dccb347849ac7267257850c2&t=6a9c0b81",
  "ceefcb98-0a1a-4f53-9a2f-d5ff2405e288": "https://file.tsxyapp.com/audio/993db2d2-bf14-4c97-ae62-59c83d8199b7.mp3?v=34&sign=5f0e10477cb724c3a3418f4f0e839b39&t=6a9c0b81",
  "5295f65d-e08d-4b72-a6f8-088d005a03ca": "https://file.tsxyapp.com/audio/1fa217c5-4455-4f9b-ab3f-cf900abd11aa.mp3?v=34&sign=f9c86078e6a2b68b9889e9b48b6a74bd&t=6a9c0b81",
  "617fb34f-16fa-4cd8-8d09-4459ef8b5052": "https://file.tsxyapp.com/audio/5da354f0-3a3a-4c56-8843-a4c6c13d8ecf.mp3?v=34&sign=1cdddcaaecd6f869129aa97b2932ef6a&t=6a9c0b81",
  "8ac64d7f-dbbb-4156-ba99-2a6f081d23cd": "https://file.tsxyapp.com/audio/319f1642-9453-460a-a86f-5d0d55456243.mp3?v=34&sign=3ae4c92e531ecd08db450f57c47f83ac&t=6a9c0b81",
  "aad00de4-2925-4f07-acb7-ca0fb3609046": "https://file.tsxyapp.com/audio/c3ed6481-555d-48a9-94a0-97e2e3d4604b.mp3?v=34&sign=47199ce38b6081f18b346e751e9a9d3b&t=6a9c0b81",
  "34a570bd-55be-4c2f-b4ee-d08fc13882e9": "https://file.tsxyapp.com/audio/12d6020f-fbd3-4846-ab66-9ffd1140c994.mp3?v=34&sign=e7e8f50da27d6ec481c9e33bf309c774&t=6a9c0b81",
  "b8b91481-56d9-4ad1-a37a-258d03354ea8": "https://file.tsxyapp.com/audio/920e5dee-b065-48f9-9380-1f5b2e0a63a9.mp3?v=34&sign=af7c5b23889971086b20b570510d003b&t=6a9c0b81",
  "a60eb30e-0f5a-4e15-bfc6-b7eff7f5bf78": "https://file.tsxyapp.com/audio/01885dd5-98c6-4bdc-b89c-3ee314b7c2a0.mp3?v=34&sign=2c993722fae308887d9b3a19e6638df0&t=6a9c0b81",
  "38ef09a7-df6e-435f-9fbe-02faed7b57f5": "https://file.tsxyapp.com/audio/0a92e848-2c29-418b-931b-3d334e5fc6a4.mp3?v=34&sign=9a20ed67483593682d78b221d5bf3207&t=6a9c0b81",
  "e4b15c00-f7cd-4ed6-b822-2a1a6f1968f2": "https://file.tsxyapp.com/audio/f1c791be-11c4-4e8f-86c1-e1a2a883a84e.mp3?v=34&sign=00bc4c08b4c00373393febe50a692d20&t=6a9c0b81",
  "3625cd94-9129-4a16-8e2a-3d15ec01bed0": "https://file.tsxyapp.com/audio/a323ba80-cb7b-49c5-8b27-d4b99bdc34fb.mp3?v=34&sign=a7227619740da77a7101ab62ffdc964b&t=6a9c0b81",
  "6ef9afab-2680-4ada-a432-232e4b725093": "https://file.tsxyapp.com/audio/c11a0186-243c-4ec5-812c-daca8904617e.mp3?v=34&sign=ff40ebb7d08f64ee5563cff74ad0ee15&t=6a9c0b81",
  "cb5285d6-0a2b-4f2e-a204-fed7dbb39f63": "https://file.tsxyapp.com/audio/0a2120e3-9f2f-40b9-8ada-59e8903c23ea.mp3?v=34&sign=69b391954b787328ddee025e9ab60903&t=6a9c0b81",
  "a2273994-ecad-4fac-9f02-9271bf0e36aa": "https://file.tsxyapp.com/audio/b8875685-0fbc-436f-9d2f-a6951bf131f9.mp3?v=34&sign=d7c320be57e1790b9509633df29dc856&t=6a9c0b81",
  "1fd30edb-0229-4be6-8d5b-23834860ae0f": "https://file.tsxyapp.com/audio/1370f577-e512-4fe7-9a1f-05385265f151.mp3?v=34&sign=4754b187cfc68da45086bdf07d7d143c&t=6a9c0b81",
  "40e133ba-d216-4eb1-9e27-f38e2af286da": "https://file.tsxyapp.com/audio/bed276ba-4354-475e-875d-9667b0767ae5.mp3?v=34&sign=f3ba1519226131cbe9d15d8149df70a5&t=6a9c0b81",
  "883b492e-854a-4ade-bb94-8360ab72dc59": "https://file.tsxyapp.com/audio/56f99739-3599-419f-9158-015635636935.mp3?v=34&sign=67bb0bb0b29c4f0a3f48876753ab5582&t=6a9c0b81",
  "d02b5a36-708d-48aa-ba72-b654bf6b283d": "https://file.tsxyapp.com/audio/fdd58d0f-a2af-4627-9659-6d86488017be.mp3?v=34&sign=bd91e1fbeb46f5ceaa2c9dbd3bcf00ac&t=6a9c0b81",
  "c9e151e8-8d3c-4014-a7a7-6b043128684e": "https://file.tsxyapp.com/audio/8a01192b-7ea4-40fe-a4ea-225a5f158dac.mp3?v=34&sign=0e9965a067236416a018071df7e067b0&t=6a9c0b81",
  "a0d195b8-3e0d-43e6-9cdd-c54d0ef0e2a3": "https://file.tsxyapp.com/audio/358780d6-62d7-4985-9d16-cb2748944ef3.mp3?v=34&sign=656a9f95ddb61b734a16e5887a127d60&t=6a9c0b81",
  "a2441083-2d1d-4d7d-b779-fa2ead10eb8a": "https://file.tsxyapp.com/audio/bd5ebf7c-3329-4f5c-b27b-57db69674f31.mp3?v=34&sign=9fae10cc7d7db7ef31c90dd2cfe91de6&t=6a9c0b81",
  "4d03fe84-5c36-4dc0-957f-d19291f7b8de": "https://file.tsxyapp.com/audio/a74a3bb0-bfde-4608-863c-f7351cb23c94.mp3?v=34&sign=00709a82f63514abd5e6a4b9d6341928&t=6a9c0b81",
  "ec2870af-5a57-464a-9b49-59b259de97f6": "https://file.tsxyapp.com/audio/873e91a2-64e8-4b63-8118-12ebce5996ef.mp3?v=34&sign=5674a2ae6eab73d9af355530b8bf163b&t=6a9c0b81",
  "cd041c0f-c870-4680-8bb2-77a92e3dd63b": "https://file.tsxyapp.com/audio/5a575787-dfa3-40a5-9aa1-5247ea9cb12a.mp3?v=34&sign=e11ccce6c9454edec4d039089305d421&t=6a9c0b81",
  "2322806d-779c-49a6-9fff-9ceb9583598a": "https://file.tsxyapp.com/audio/1fdcd8a8-7df2-419b-9792-df293b5531be.mp3?v=34&sign=9b1e054e4b9a9e656e8d6f3c18ba6808&t=6a9c0b81",
  "3a65dc75-5062-4bf8-a936-85ea221bb012": "https://file.tsxyapp.com/audio/d25bc360-db0c-40c2-8c0c-06a34682dff7.mp3?v=34&sign=d5e7eeabd32c79427e8f687f151ef0ec&t=6a9c0b82",
  "cb9b3277-e9a7-42d9-81fc-25d7555dda53": "https://file.tsxyapp.com/audio/83982e84-061e-4473-a62a-6f74adc0584a.mp3?v=34&sign=d32c6d4b2e22d067582d96d9dcb73dba&t=6a9c0b82",
  "f7ae974a-3205-401c-a4c6-cf2bff3d1275": "https://file.tsxyapp.com/audio/a84fbc8d-c0e5-4a3c-9dc7-5f82512cc3c8.mp3?v=34&sign=208794ac1b58f37b70c4681b4e068813&t=6a9c0b82",
  "7ddd7e2a-8846-4ec6-840e-24ff3e0ff501": "https://file.tsxyapp.com/audio/f3300bac-0667-4adf-bbd2-ced04fdb056d.mp3?v=34&sign=b58803c390847ededbbc54b3c210b4be&t=6a9c0b82",
  "5aaba143-50fa-43c7-9359-dbf8db47f376": "https://file.tsxyapp.com/audio/43e7196f-f2fd-4f54-9ff5-af3c1643f5f2.mp3?v=34&sign=70f43a340844769c18f2dc475afe3d95&t=6a9c0b82",
  "b0d5d38a-366e-446c-84de-c5cf19e23047": "https://file.tsxyapp.com/audio/330ad9e7-6ae7-450f-bfc9-a866574eb0f4.mp3?v=34&sign=9a1eac7b147df7afcfcad4021910d2a9&t=6a9c0b82",
  "7c4acedf-6c48-4e7f-8be9-ffe91044e3e6": "https://file.tsxyapp.com/audio/fbfd30b7-f1e5-49c3-bcee-097e800a4a0c.mp3?v=34&sign=16f236def460a28bf0ec58d4e4bb2be8&t=6a9c0b82",
  "96627637-b6f3-441d-8dcb-0f3042dc4e53": "https://file.tsxyapp.com/audio/81306d25-be96-4fcc-bc9c-2666cd28cff7.mp3?v=34&sign=46ffdfd77966e5701d66fcdbf214271e&t=6a9c0b82",
  "94ae19e4-b901-460a-8dc7-ba5ed57a6733": "https://file.tsxyapp.com/audio/8203122a-04c3-4d8c-8d17-e509ddc875ae.mp3?v=34&sign=891bc559c0e935e87dc8d0d8454ec6ad&t=6a9c0b82",
  "0ea9fac6-8305-461a-a5ed-f02a63411b79": "https://file.tsxyapp.com/audio/63922467-657d-4d97-b45d-2a6243f84ff9.mp3?v=34&sign=74c94efc6b5d74edbd27be3fc52c390c&t=6a9c0b82",
  "fb453ceb-fa76-41d8-a431-73b2ea13bad9": "https://file.tsxyapp.com/audio/eb910bab-0cf9-4fff-8301-55bfc679878e.mp3?v=34&sign=6c5db7223c7fd81e84ae6cdaf3c10af7&t=6a9c0b82",
  "d82b989b-d303-401a-80b5-988e2538ca5e": "https://file.tsxyapp.com/audio/3ca67da5-466f-4fff-8390-4874286d27c4.mp3?v=34&sign=50b3305c689e802cf69935662f639faa&t=6a9c0b82",
  "5e142a17-bcdf-484e-a0f2-9a9beda241c5": "https://file.tsxyapp.com/audio/346cf4d9-d91e-4fdd-acdd-a2182bd30547.mp3?v=34&sign=850979736985fc2c2c494bf6c617fb73&t=6a9c0b82",
  "45308bc1-0f6c-4746-9b00-d824d524cb6e": "https://file.tsxyapp.com/audio/c08b82aa-215f-4eda-935a-d3e4dea1d60a.mp3?v=34&sign=b47c1b2de7d0e4bc3b4718dab694dee4&t=6a9c0b82",
  "1d052901-35dd-49ec-bbfc-e563bec9019b": "https://file.tsxyapp.com/audio/0f5f38da-59f6-4ba7-8902-d919c5227a1f.mp3?v=34&sign=c8c2088ceeb2d0a54ed2c70cebb482d1&t=6a9c0b82",
  "1bb0f9b0-9dd0-478d-a757-e52173884923": "https://file.tsxyapp.com/audio/b474fb71-74f6-4765-850d-1d73bd4bc356.mp3?v=34&sign=f9f25febe1603947f7afeea08b9cac27&t=6a9c0b82",
  "f062a825-acc9-4151-9df2-9fc6888c9e16": "https://file.tsxyapp.com/audio/7f094d4f-923e-4ee3-99b1-a3ce71295f50.mp3?v=34&sign=cd11e3e8d991d0e062b48be419bea1f0&t=6a9c0b82",
  "aae41bf0-e834-4193-b01b-5946bdf14d86": "https://file.tsxyapp.com/audio/313657d7-d402-4d1c-8874-55270ea21d4b.mp3?v=34&sign=43dccc5bc3506bfc8fb4080eaaa39748&t=6a9c0b82",
  "c492bb38-2666-4acf-9474-afb7d5bf7bda": "https://file.tsxyapp.com/audio/89f255a4-486a-4300-a8c8-a5ab1b3024d1.mp3?v=34&sign=c7d2a9dbe670bd2ea350593f59a2397d&t=6a9c0b82",
  "372158f7-b7b9-41de-90ea-f9306a2165d0": "https://file.tsxyapp.com/audio/c37263fc-903d-4006-94ea-cb37c5047322.mp3?v=34&sign=e6157cf3779e9ebbe2e481210692942b&t=6a9c0b82",
  "ba554abf-045d-487b-b384-fdd3fdda0317": "https://file.tsxyapp.com/audio/fc89e5bf-48e2-4eea-a595-16eba1e67a2e.mp3?v=34&sign=79a6777b7bb4a6a954f96e0dc22cb887&t=6a9c0b81",
  "70d68664-08e9-44d6-94f6-aea95b5fb068": "https://file.tsxyapp.com/audio/b43c3cd9-b454-4361-a5da-481c3f4cc21d.mp3?v=34&sign=b437eba97d8535425ed536f7cee0e4ab&t=6a9c0b81",
  "b9789c8f-533c-4b00-8ca7-f48ad5812d19": "https://file.tsxyapp.com/audio/0ffa6374-197a-477b-b88a-d930d3cb7749.mp3?v=34&sign=de833a74dadc5431cbee8251bf69a033&t=6a9c0b81",
  "95891a46-894b-4d73-84e1-55c1a8abcf7e": "https://file.tsxyapp.com/audio/e0ad4009-c599-469b-aa7a-3382cf0acfc9.mp3?v=34&sign=a8d847095436303fda1b9632a0688164&t=6a9c0b81",
  "d783f3d9-825d-4f81-b851-021c423cec40": "https://file.tsxyapp.com/audio/beec6aa7-75e3-437c-8209-e2841ba2410c.mp3?v=34&sign=71818591944f7f0f521c5ca226d31c14&t=6a9c0b81",
  "05e67041-1c47-449c-9f17-83362e79dfcb": "https://file.tsxyapp.com/audio/07e4629c-359f-4282-8a1d-7544d92562d0.mp3?v=34&sign=514af72fa610b36b66a471168c622ac1&t=6a9c0b81",
  "1d757661-99cc-4cc8-ae48-3097a668adbc": "https://file.tsxyapp.com/audio/6fde65d4-c154-40f5-9db9-030b0410da8e.mp3?v=34&sign=171ec41fbf58b47089ddb9070401951f&t=6a9c0b81",
  "6b791c82-4660-4946-b031-f220ee352ce4": "https://file.tsxyapp.com/audio/07898d23-c6a4-4c15-a9ba-3eec4628c320.mp3?v=34&sign=d29c98f9de3188ae6896debe1ad009eb&t=6a9c0b81",
  "282e44df-29ee-47fc-8708-7aaa0a2a7193": "https://file.tsxyapp.com/audio/64c0ae12-fae4-4267-93f7-669ee0c779a7.mp3?v=34&sign=96a7802890a5d760a03ed57083e56d30&t=6a9c0b81",
  "41dffe6b-d5c7-4806-a234-dce31057dd69": "https://file.tsxyapp.com/audio/fe79adba-940c-4aad-b8de-713d053134cd.mp3?v=34&sign=122f1814dddcfc75ce067dc9304f47a3&t=6a9c0b81",
  "6eee358a-304e-4a33-8bfe-045618987718": "https://file.tsxyapp.com/audio/6f8ef29b-ff14-4312-83b5-6c6625333736.mp3?v=34&sign=b44997d31804fd93f8bf17bf49fa8e89&t=6a9c0b81",
  "a6bd9cda-1ba2-4026-950a-cb593d384bd5": "https://file.tsxyapp.com/audio/2973c95e-7f7d-480f-a759-f7c5c76ba172.mp3?v=34&sign=5ba579d3ff51bbe39f5ecc9bd3d08324&t=6a9c0b81",
  "e51282e7-34fb-4da5-853d-8c879ed43a24": "https://file.tsxyapp.com/audio/4d27c117-fe62-493f-bd10-a0328c0c730f.mp3?v=34&sign=a1e8ffe54472589ef274bb5d2bc95e72&t=6a9c0b81",
  "5cabcb61-8e43-4d93-8b62-668ef246b8bf": "https://file.tsxyapp.com/audio/623b2d27-69ec-4195-a519-e6a40eb6a8ec.mp3?v=34&sign=ed4b65f6de3953fcefd21d8514037d50&t=6a9c0b81",
  "ba0eed9c-a1d0-4496-b77c-d0b9bd04407d": "https://file.tsxyapp.com/audio/3b653987-0eb4-41d4-b0eb-c7b4500f3a03.mp3?v=34&sign=ff1c8db530b8371facdfc3a5bab270d2&t=6a9c0b81",
  "191bec2e-bd50-4567-be34-72b2abaaa0e3": "https://file.tsxyapp.com/audio/3a5f8af1-848a-49a0-92fe-27fad6f90275.mp3?v=34&sign=7228aca96910a15232d0205181ee5a1b&t=6a9c0b81",
  "0caab7cf-49d0-4d2a-acd2-d396cf0b2684": "https://file.tsxyapp.com/audio/d1804a65-88b0-420c-a89e-a50f52baf807.mp3?v=34&sign=5918b927e0be32e607f76b24c7ea9cb6&t=6a9c0b81",
  "db89fa90-3336-4af1-89e7-05cec2e9f6a4": "https://file.tsxyapp.com/audio/0839cde8-f779-45ea-b979-c3edf95601f9.mp3?v=34&sign=2f65a8aa8dcbf21a34866d394c00e748&t=6a9c0b81",
  "b4979a29-2c0d-49fe-a790-1e027dff161d": "https://file.tsxyapp.com/audio/852c56bd-5cb3-4c1e-a1cd-2be5d34fb0a3.mp3?v=34&sign=3de1e133d61cc8c9ada780626b6789e8&t=6a9c0b82",
  "f4b6499c-7864-4201-97e7-f71d89208021": "https://file.tsxyapp.com/audio/6fe1f1d7-c1b6-46ce-bfe1-8898a5aa8bea.mp3?v=34&sign=78cfafa7ffb8b7aae16b2f8fcb7cc352&t=6a9c0b82",
  "566ace15-6720-4b9b-b6f1-b801d9a657cd": "https://file.tsxyapp.com/audio/4e7049b1-39aa-49a3-9f9f-93facbc3dae6.mp3?v=34&sign=341f7ec299dcde390035f7b0d78ed237&t=6a9c0b82",
  "38a4d2b2-8894-48eb-a8dd-c8715e02bc5f": "https://file.tsxyapp.com/audio/2b8ba40b-2313-410a-9df3-79bf029db870.mp3?v=34&sign=0e814bf290622b908d1ff9113b71b08b&t=6a9c0b82",
  "0dd63164-4378-48e3-8fef-a3b80151feae": "https://file.tsxyapp.com/audio/0c2e90e9-0a53-45eb-95a8-514d14df584e.mp3?v=34&sign=b90ce50f16089226d6c9e3d58357679b&t=6a9c0b82",
  "179dc3a5-b6ab-487a-a28a-e5c97a7f5a07": "https://file.tsxyapp.com/audio/9ab14eaa-6f5e-43e9-836c-a89f4acb63f8.mp3?v=34&sign=2783519471c3256fe656a72f69471c61&t=6a9c0b82",
  "b1cd43f9-8b5c-4d02-a30f-7c59499e0893": "https://file.tsxyapp.com/audio/b1f08c83-eed0-4626-8d3d-d309f4fe39df.mp3?v=34&sign=568757c479d411e084c8e7d8ba1ec058&t=6a9c0b82",
  "267f6d93-a445-4a9a-aff1-49209420dcc8": "https://file.tsxyapp.com/audio/9d668b60-38a2-4630-9913-96e4359bcb22.mp3?v=34&sign=75c0ed160715289253639187bf3ca6e1&t=6a9c0b82",
  "813e52fb-a6d2-4b21-8901-00c8cf51cc3b": "https://file.tsxyapp.com/audio/d96616b0-fb62-4efd-b513-73f8d4948a56.mp3?v=34&sign=a3797bb926c38d8810038d10ab87d747&t=6a9c0b82",
  "db83b5af-f3ef-4886-9af4-f7deb49b85e3": "https://file.tsxyapp.com/audio/274f50df-b8fb-48d9-952d-b00a26d2ea65.mp3?v=34&sign=67bf81a712b1d6d8cd0eceecc88ee835&t=6a9c0b82",
  "e671273d-f11b-48fe-8daf-d8ca6156b880": "https://file.tsxyapp.com/audio/9cb634ba-50e3-417c-acfa-de9884bf63c4.mp3?v=34&sign=1a4a2ac012c2a43821dd4a466d378372&t=6a9c0b82",
  "dafe2c82-12ea-47fe-893d-9fa56c8ffc84": "https://file.tsxyapp.com/audio/63bb3f66-7b46-4967-8697-ff9e9ea3388c.mp3?v=34&sign=1729285db88c2cc52f61c165895589c6&t=6a9c0b82",
  "acc15b36-288b-4f37-9eec-c4df6c267584": "https://file.tsxyapp.com/audio/59c83908-6d2c-4f3c-a8b2-cdd09673f2ed.mp3?v=34&sign=4bbcc8f53e7b6957c6574f7478fe09ab&t=6a9c0b82",
  "7d608fec-266d-450b-be42-d7d31f46ec7a": "https://file.tsxyapp.com/audio/542cc028-89bd-4c38-8255-335de2b4f4f2.mp3?v=34&sign=090592fe758b278258432020db91cd0e&t=6a9c0b82",
  "875e2c24-faa6-40bf-b6d1-c3ada68420bb": "https://file.tsxyapp.com/audio/3d0619fd-4ffa-4bc5-9469-e41637c4f015.mp3?v=34&sign=2e0bc6c903792e144c06b77cb1ce96d1&t=6a9c0b82",
  "2c8d5fcb-c0e0-4b86-acd6-0934fc6c564a": "https://file.tsxyapp.com/audio/836ca38a-f01d-4b4c-a063-0d9b00e0cebe.mp3?v=34&sign=51406d3d214880f8acdad1d980593996&t=6a9c0b82",
  "9b29ef5b-15cc-40b4-9882-074927ecb26c": "https://file.tsxyapp.com/audio/feacc66b-654b-47f7-a52b-bcbf187658e0.mp3?v=34&sign=05db40ee7cc70bfd41137d3732cecac8&t=6a9c0b82",
  "5e4ab6a9-3cc5-4a6e-b171-7fd006545c84": "https://file.tsxyapp.com/audio/90f8fcc2-db50-4ce8-82e7-0605b71f09be.mp3?v=34&sign=f955e4e55d49dde0cc8f97222200820c&t=6a9c0b82",
  "4792bef0-b2a4-4983-9552-52c2786deacb": "https://file.tsxyapp.com/audio/725ede06-22af-438c-a73f-035f32c3a36a.mp3?v=34&sign=34e77d4d2ef8f05b5c75ebd11a96924c&t=6a9c0b82",
  "77c3e963-8bcd-4f72-85dc-e7353a468233": "https://file.tsxyapp.com/audio/88f2e49e-88d0-42ec-b784-cdef82bc9d3f.mp3?v=34&sign=ae289008eb64c767fe6382c6fee0aab8&t=6a9c0b82",
  "b4d394d8-956e-4051-9894-d5732a186d66": "https://file.tsxyapp.com/audio/1c66e2a0-bcf0-4681-9b68-e019cf85cd5b.mp3?v=34&sign=375884899e86add6a1bd43a5332b0ca6&t=6a9c0b82",
  "fbb53cb9-c1e0-40c1-8ce4-7eb418828869": "https://file.tsxyapp.com/audio/dba9b4e6-3730-405a-8bc2-f814f6ccf31a.mp3?v=34&sign=12321c8333727f33fbfb1bd9fa254a3f&t=6a9c0b82",
  "5f5724f2-ad80-4adc-ac23-8d4f179d1095": "https://file.tsxyapp.com/audio/735e7e46-6c3f-423d-8628-8379641bb5b3.mp3?v=34&sign=ea669cf73164f47d0107d9aec7e3d289&t=6a9c0b83",
  "f50910f7-4c4d-41d8-b9df-bdbda60cf91d": "https://file.tsxyapp.com/audio/0f57ad0f-2bbc-4acc-9c8f-d28fdb163556.mp3?v=34&sign=311d0afe9e9fdcb6ac878fd872bbd0cf&t=6a9c0b83",
  "8ffe799a-f501-4496-abb7-dad75a63ed4b": "https://file.tsxyapp.com/audio/efaeddf7-32f1-45cd-8c9b-5f2783439b0a.mp3?v=34&sign=d6e4a9de89b24cea4b81640c8decffa3&t=6a9c0b83",
  "5ccf0de7-22fb-4940-b154-70eea124dd6d": "https://file.tsxyapp.com/audio/25ccec3b-5971-4c00-961e-d73962cc5f28.mp3?v=34&sign=826b4555b74729f3601b2988fba877bb&t=6a9c0b83",
  "1660b291-448a-4bcd-b4b9-99a9a1c44e88": "https://file.tsxyapp.com/audio/5ec90ea6-a1e1-402b-8713-64dab6ab79f6.mp3?v=34&sign=c3b163a28845891105c6e25c0c8a76f4&t=6a9c0b83",
  "6e50cc09-a210-4c13-9bf8-39f37cc2bdc3": "https://file.tsxyapp.com/audio/2e8a6544-d66c-422e-a9a0-c7070402aace.mp3?v=34&sign=d4c7130e38ef81a42d7c943c5f78e822&t=6a9c0b83",
  "d30b764b-cd83-4d3a-8eac-73588a6deaa9": "https://file.tsxyapp.com/audio/eaa95659-79bd-4701-8383-d6177246fb67.mp3?v=34&sign=c4cb37d3fd445e2d210efb607ee04458&t=6a9c0b83",
  "53e3248d-9f25-4aed-a1db-bb74a8a57582": "https://file.tsxyapp.com/audio/cb2f10f8-c6e2-4639-83ec-4ac3e97deae5.mp3?v=34&sign=c3aa81fbeda439058d1bc73703f3369d&t=6a9c0b83",
  "23b85053-5ddf-493b-a366-d6ab0cd52c60": "https://file.tsxyapp.com/audio/d4c17c2f-f738-4ab1-a755-de757ababe8b.mp3?v=34&sign=976f7e2386a398698c6fc7b8269a0e80&t=6a9c0b83",
  "d4d29e53-8ec5-45dc-a403-b6514efd03a9": "https://file.tsxyapp.com/audio/94950a85-b296-41e8-ba3f-553e7478dfd8.mp3?v=34&sign=557753c9c9f9681060f408d8956435b2&t=6a9c0b83",
  "ea2ea101-e712-4d6a-9a8a-b817df3359bd": "https://file.tsxyapp.com/audio/0d06ae74-6dd4-49ac-97ae-6e0d2c27b0e0.mp3?v=34&sign=316ac7382a0c15882884e544ee2be8a5&t=6a9c0b83",
  "d97f3e77-37c5-44ca-8f60-aef7b6f91ee4": "https://file.tsxyapp.com/audio/013252a8-ebdc-46cb-97f5-d36bebd2d99e.mp3?v=34&sign=e0aff5e2b3263e06ad06d0fb447cc3be&t=6a9c0b83",
  "26a708dd-a527-47d8-bf46-e94282d00b8c": "https://file.tsxyapp.com/audio/f9070ed5-45ce-4066-b9c9-c0429e299c41.mp3?v=34&sign=4fc6b2ae3053af617246631b554f250e&t=6a9c0b83",
  "46cda7cb-8617-4413-83fb-906e536ed646": "https://file.tsxyapp.com/audio/cb03492f-78cc-4202-a4ed-c09240a24b45.mp3?v=34&sign=631b0537c6cd6ed5461f25089be4b28c&t=6a9c0b83",
  "465b175d-12db-485a-984d-c33e91408cc1": "https://file.tsxyapp.com/audio/a166140f-822f-4463-8e7c-1c9c0e758faf.mp3?v=34&sign=1592e759407bef128da160d078beff41&t=6a9c0b83",
  "9d8da97d-c8b6-45e0-8491-cc4b5ac1edeb": "https://file.tsxyapp.com/audio/210f8553-396a-4686-a4e4-c02fd51c0f56.mp3?v=34&sign=f1b4205e88a02d8b8085ea93a8225591&t=6a9c0b83",
  "1e64ee86-78fa-449c-a491-fff9f85f4f99": "https://file.tsxyapp.com/audio/0dca7d2b-4ec5-4333-8cbc-5723a38212cd.mp3?v=34&sign=a9c35c51887bec0b512d7340698a5582&t=6a9c0b83",
  "6f426af1-793b-4fc2-b436-61049470de2d": "https://file.tsxyapp.com/audio/9f13ef23-9622-4d4d-bbf8-757d3e85460d.mp3?v=34&sign=9a2d3a08f1b6a6faa33bc6c216998f38&t=6a9c0b83"
};

  var requestUrl = typeof $request !== "undefined" && $request.url || "";
  var requestHeaders = typeof $request !== "undefined" && $request.headers || {};
  var responseBody = typeof $response !== "undefined" && $response.body || "";

  function parseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function getPath(urlStr) {
    var match = String(urlStr || "").match(/^https?:\/\/[^\/]+(\/[^?#]*)/i);
    return match ? match[1] : "";
  }

  function getQueryParameter(urlStr, param) {
    var match = String(urlStr || "").match(new RegExp("[?&]" + param + "=([^&/#]*)", "i"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function requestHeader(name) {
    var target = String(name || "").toLowerCase();
    var found = "";
    Object.keys(requestHeaders).forEach(function (k) {
      if (k.toLowerCase() === target) {
        found = requestHeaders[k];
      }
    });
    return found;
  }

  function getSessionIdFromToken(token) {
    if (!token) return "";
    var jwt = token.indexOf("Bearer ") === 0 ? token.slice(7) : token;
    var parts = jwt.split(".");
    if (parts.length !== 3) return "";
    try {
      var payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (payloadBase64.length % 4 !== 0) {
        payloadBase64 += "=";
      }
      var decoded = atob(payloadBase64);
      var obj = parseJson(decoded);
      return obj && obj.SessionId ? String(obj.SessionId) : "";
    } catch (e) {
      return "";
    }
  }

  function loadAudioMap() {
    var raw = $persistentStore.read(PERSIST_AUDIO_MAP_KEY);
    var parsed = parseJson(raw || "");
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function saveAudioMap(map) {
    $persistentStore.write(JSON.stringify(map), PERSIST_AUDIO_MAP_KEY);
  }

  function loadCatalog() {
    var raw = $persistentStore.read(PERSIST_CATALOG_KEY);
    var parsed = parseJson(raw || "");
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function saveCatalog(catalog) {
    $persistentStore.write(JSON.stringify(catalog), PERSIST_CATALOG_KEY);
  }

  function isSafeResourceId(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
  }

  function normalizeCourseCategory(raw) {
    var num = Number(raw);
    return isNaN(num) ? 0 : num;
  }

  function listItems(payload) {
    if (!payload || typeof payload !== "object") return [];
    var data = payload.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  }

  function recordForItem(item, kind, categoryFromRequest) {
    if (!item || typeof item !== "object") return null;
    var id = String(item.id || "");
    if (!isSafeResourceId(id)) return null;

    var title = String(item.title || id);
    var poster = String(item.poster || "");
    var ext = "mp4";

    if (kind === "report") {
      var matchExt = title.match(/\.(pdf|docx)(?:[?#].*)?$/i);
      ext = matchExt ? matchExt[1].toLowerCase() : "pdf";
    } else if (kind === "live") {
      ext = item.extension ? String(item.extension).toLowerCase() : "mp3";
    }

    var category = normalizeCourseCategory(item.courseCategory || categoryFromRequest);
    return {
      id: id,
      kind: kind,
      extension: ext,
      title: title,
      poster: poster || (FILE_ORIGIN + "/" + kind + "/" + id + ".jpg"),
      courseCategory: category,
      url: FILE_ORIGIN + "/" + kind + "/" + id + "." + ext,
      seenAt: Date.now()
    };
  }

  function copyEnvelope(payload) {
    var rewritten = {};
    if (!payload || typeof payload !== "object") return rewritten;
    Object.keys(payload).forEach(function (key) {
      rewritten[key] = payload[key];
    });
    rewritten.hasError = false;
    rewritten.msg = "";
    rewritten.errorCode = 0;
    return rewritten;
  }

  function buildMediaSuccessBody(payload, record, realAudioUrl) {
    var rewritten = copyEnvelope(payload);
    var mediaUrl = record.url;
    var audioUrl = realAudioUrl || mediaUrl;

    rewritten.data = {
      id: record.id,
      title: record.title,
      blob: mediaUrl,
      audio: audioUrl,
      poster: record.poster || (FILE_ORIGIN + "/" + record.kind + "/" + record.id + ".jpg"),
      courseCategory: normalizeCourseCategory(record.courseCategory)
    };
    return JSON.stringify(rewritten);
  }

  function buildReportSuccessBody(payload, record, blob) {
    var rewritten = copyEnvelope(payload);
    rewritten.data = {
      id: record.id,
      title: record.title,
      url: blob,
      blob: blob
    };
    return JSON.stringify(rewritten);
  }

  function syncTokenToWorker(authorization) {
    if (!authorization) return;
    $httpClient.post(
      {
        url: WORKER_TOKEN_SYNC_URL,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: authorization }),
        timeout: 3
      },
      function () {}
    );
  }

  // 动态按需查询 (仅针对未来发布、不在内置 177 门课程种子库中的全新课程)
  function fetchCourseAudioOnDemand(record, payload) {
    var authorization = requestHeader("authorization");
    if (!/^Bearer\s+\S+/i.test(authorization)) {
      $done({ body: buildMediaSuccessBody(payload, record) });
      return;
    }

    var sessionId = getSessionIdFromToken(authorization);
    var cat = record.courseCategory || 0;
    var lookupUrl = ADMIN_COURSE_LIST + "?category=" + cat + "&page=1" + (sessionId ? ("&sessionId=" + sessionId) : "");

    $httpClient.get(
      {
        url: lookupUrl,
        headers: { Authorization: authorization, Accept: "application/json" },
        timeout: 4
      },
      function (error, response, body) {
        var adminPayload = parseJson(body || "");
        var items = adminPayload && adminPayload.data && Array.isArray(adminPayload.data.items)
          ? adminPayload.data.items
          : [];
        var match = null;

        items.some(function (item) {
          if (String(item && item.id || "") === record.id) {
            match = item;
            return true;
          }
          return false;
        });

        var realAudio = match && String(match.audio || "");
        if (realAudio) {
          var map = loadAudioMap();
          map[record.id] = realAudio;
          saveAudioMap(map);
        }

        $done({ body: buildMediaSuccessBody(payload, record, realAudio) });
      }
    );
  }

  function fetchReportBlobAndRewrite(record, payload) {
    var authorization = requestHeader("authorization");
    syncTokenToWorker(authorization);

    if (!/^Bearer\s+\S+/i.test(authorization)) {
      $done({});
      return;
    }

    var sessionId = getSessionIdFromToken(authorization);
    var lookupUrl = ADMIN_REPORT_LIST + "?title=" + encodeURIComponent(record.title) + "&page=1" + (sessionId ? ("&sessionId=" + sessionId) : "");
    
    $httpClient.get(
      {
        url: lookupUrl,
        headers: { Authorization: authorization, Accept: "application/json" },
        timeout: 6
      },
      function (error, response, body) {
        var status = response && Number(response.status);
        var adminPayload = parseJson(body || "");
        var items = adminPayload && adminPayload.data && Array.isArray(adminPayload.data.items)
          ? adminPayload.data.items
          : [];
        var match = null;

        items.some(function (item) {
          if (String(item && item.id || "") === record.id || String(item && item.title || "") === record.title) {
            match = item;
            return true;
          }
          return false;
        });

        var blob = match && String(match.blob || "");
        if (error || status < 200 || status >= 300 || !blob) {
          $done({});
          return;
        }

        $done({ body: buildReportSuccessBody(payload, record, blob) });
      }
    );
  }

  var payload = parseJson(responseBody);
  var path = getPath(requestUrl);
  var isCourse = path.indexOf("/api/course") === 0;
  var isLive = path.indexOf("/api/livefile") === 0;
  var isReport = path.indexOf("/api/report") === 0;
  var isList = /\/list(?:\/latest)?$/.test(path) || /\/latest$/.test(path) || /\/month\/items$/.test(path);

  if (!payload || (!isCourse && !isLive && !isReport)) {
    $done({});
    return;
  }

  // 1. 列表阶段：缓存标题和元数据，并同步 Token 给 Worker
  if (isList) {
    var authorization = requestHeader("authorization");
    syncTokenToWorker(authorization);

    var catalog = loadCatalog();
    var kind = isCourse ? "course" : (isLive ? "live" : "report");
    var categoryFromRequest = isCourse ? getQueryParameter(requestUrl, "category") : 0;
    var added = 0;

    listItems(payload).forEach(function (item) {
      var record = recordForItem(item, kind, categoryFromRequest);
      if (!record) return;
      catalog[record.id] = record;
      added += 1;
    });

    if (added > 0) saveCatalog(catalog);
    console.log("[TSXY] cached " + String(added) + " resource(s) from " + path);
    $done({});
    return;
  }

  var errorMessage = String(payload.msg || "");
  var isSubscriptionError = errorMessage.indexOf("未购买订阅") !== -1 || errorMessage.indexOf("无权查看研报") !== -1;
  if (payload.hasError !== true || !isSubscriptionError) {
    $done({});
    return;
  }

  var id = getQueryParameter(requestUrl, "id");
  if (!isSafeResourceId(id)) {
    $done({});
    return;
  }

  var saved = loadCatalog()[id];
  var candidate = saved;

  if (isReport) {
    if (!candidate || candidate.kind !== "report") {
      $done({});
      return;
    }
    fetchReportBlobAndRewrite(candidate, payload);
    return;
  }

  if (!candidate && isCourse) {
    candidate = {
      id: id,
      kind: "course",
      extension: "mp4",
      title: id,
      poster: FILE_ORIGIN + "/course/" + id + ".jpg",
      courseCategory: 0,
      url: FILE_ORIGIN + "/course/" + id + ".mp4",
      seenAt: Date.now()
    };
  }

  if (!candidate) {
    $done({});
    return;
  }

  // 2. 视频课程详情阶段：优先从全量 177 门内置种子映射或本地动态持久化缓存秒读
  if (isCourse) {
    var dynamicAudioMap = loadAudioMap();
    var resolvedAudioUrl = SEED_AUDIO_MAP[id] || dynamicAudioMap[id] || "";

    if (resolvedAudioUrl) {
      console.log("[TSXY] resolved course audio instantaneously by UUID: " + id);
      $done({ body: buildMediaSuccessBody(payload, candidate, resolvedAudioUrl) });
      return;
    }

    // 未命中（全新未知课程）：触发按需动态在线查询与增量写入
    fetchCourseAudioOnDemand(candidate, payload);
    return;
  }

  // 3. 直播资源：直接返回
  $done({ body: buildMediaSuccessBody(payload, candidate) });
})();
