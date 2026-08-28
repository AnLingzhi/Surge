/**
 * Surge 资源解锁与解析重写脚本 (终极生产级 - 静态种子 + 动态自学习)
 * 特性: 内置 138 课程全量 MP3 映射 (0延迟秒开) + 动态增量自学习 + Token 自动同步
 */
(function () {
  var FILE_ORIGIN = "https://file.tsxyapp.com";
  var ADMIN_REPORT_LIST = "http://admin.tsxyapp.com/api/report/list";
  var ADMIN_COURSE_LIST = "http://admin.tsxyapp.com/api/course/list";
  var WORKER_TOKEN_SYNC_URL = "https://tsxy-viewer.xai-kg.workers.dev/api/update-token-by-surge";
  var PERSIST_CATALOG_KEY = "tsxy_resource_catalog_v3";
  var PERSIST_AUDIO_MAP_KEY = "tsxy_audio_uuid_mapping_v3";

  // 内置官方全量 138 门课程的真实 .mp3 映射表 (实现 0 网络请求、0 延迟、100% 稳定秒开)
  var SEED_AUDIO_MAP = {
  "55c2dc3c-90bb-4213-b43d-a6954ba6095b": "https://file.tsxyapp.com/audio/1aa0632e-d061-4461-b678-482edd089826.mp3?v=34&sign=6b755b14412365784430504f374c55b7&t=6a917c77",
  "6b642b6b-ea98-424e-8a72-bc7bd5d9fc7e": "https://file.tsxyapp.com/audio/757076e0-d165-4396-b06b-85a3ed4638f2.mp3?v=34&sign=288e9474c9bb45b8702f37ebf2c27142&t=6a917c77",
  "a1653b0c-6e3d-48fc-a7ed-f83340423aaa": "https://file.tsxyapp.com/audio/8aab6108-7b8c-417f-a736-b387a1e3d25a.mp3?v=34&sign=525f1756705cd6f52f6c58c92fcf90fe&t=6a917c77",
  "9774b2e0-4183-4412-b7c0-595fb8d08780": "https://file.tsxyapp.com/audio/31159832-19b6-420b-88df-9f96e556a8ec.mp3?v=34&sign=e97e86009e75209f1d91f94d2a440f45&t=6a917c77",
  "5603283f-6873-4caa-968d-2530eac09577": "https://file.tsxyapp.com/audio/a1cf5ee1-c67e-4972-864e-90c598361114.mp3?v=34&sign=40927f6a5c1795d56123660861212da6&t=6a917c77",
  "53b54863-dab5-4bc6-ae34-f68e8ba1500c": "https://file.tsxyapp.com/audio/9232354f-6862-41ae-a267-d378809543ed.mp3?v=34&sign=a413bfc8146b6d62c385240deec96426&t=6a917c77",
  "3dcf1b53-b6b0-4b53-bb5a-980a023bf6b6": "https://file.tsxyapp.com/audio/1d7c9f96-6989-418d-8838-30c3e68d8f84.mp3?v=34&sign=ec60b80bbc9a3b4c83b1985d0124361d&t=6a917c77",
  "4273d0f0-9707-43ad-ad44-7b7e56fa75bd": "https://file.tsxyapp.com/audio/dd86f539-3ece-4a90-934a-91b94a4be2b9.mp3?v=34&sign=b49c26b88177f2b18ee0820d9ab1c34f&t=6a917c77",
  "1d527e17-a16e-4686-b5c8-0f8b50d403f2": "https://file.tsxyapp.com/audio/4937f365-ae17-4dce-ab22-80fc5f80a36d.mp3?v=34&sign=60eda7b467c756ed19d6fb306a704573&t=6a917c77",
  "095a1ff7-6db9-4a84-917a-4c8ee98efe18": "https://file.tsxyapp.com/audio/1886ad30-f95b-4dde-abde-839b6f7d176e.mp3?v=34&sign=7886c9b06b09d748adc4d14125dddbd6&t=6a917c77",
  "00d8e6fb-b6b0-4ae2-9200-2b8e72fb56ab": "https://file.tsxyapp.com/audio/32b9432b-e220-49ed-8137-cf93c0514099.mp3?v=34&sign=46e0e2927468566874343f5b8b4541ee&t=6a917c77",
  "e36aa954-0163-47ce-8882-96746b03fa2f": "https://file.tsxyapp.com/audio/e25dd465-3e8b-4626-9399-86506477110f.mp3?v=34&sign=baf5fb28f37c55a98e8bae33c7f5da3e&t=6a917c77",
  "830f9982-cef9-47da-91e3-be5eab476115": "https://file.tsxyapp.com/audio/7a6033a0-afd2-4dc6-aa0d-29b622e359ac.mp3?v=34&sign=5a7366cab7175cfcbfecdaffa11b28f3&t=6a917c77",
  "07985abc-064d-442c-b00b-77a48c0cb9b1": "https://file.tsxyapp.com/audio/a9feca15-b8f3-4f74-86f6-0060ebfe9a3d.mp3?v=34&sign=72645782e433061e3a769bc9d03baaab&t=6a917c77",
  "b6bf4bd2-1599-44ec-9a55-ebc93405894f": "https://file.tsxyapp.com/audio/bd261646-464e-4342-b0ad-f6a7313d192a.mp3?v=34&sign=1d74e0a38b4208b9217e2cfd2d7769a3&t=6a917c77",
  "d388dfca-0175-44f8-a556-e87115995d42": "https://file.tsxyapp.com/audio/dc5ff398-6c32-4d3b-bb9a-b57bbdf4159e.mp3?v=34&sign=007120953477f80661d3c35e43f0fe3b&t=6a917c77",
  "6131d903-b168-42b9-9fac-014e3708d0b1": "https://file.tsxyapp.com/audio/d6b510c5-c1fc-46d9-b5e0-b49b8f264b49.mp3?v=34&sign=dbffcc124ffdf3369fe253ee5187b1ef&t=6a917c77",
  "638cf985-90a5-4542-af29-20df25b60c5b": "https://file.tsxyapp.com/audio/48931d8e-f7c3-49b9-8c32-0db938594abc.mp3?v=34&sign=d130963767624f6b0cac1657f4380c15&t=6a917c77",
  "33113f5a-3486-45d4-89ce-8b59ad6db189": "https://file.tsxyapp.com/audio/1db3a219-b469-4394-9e4b-65e257873288.mp3?v=34&sign=83000fb0a70f6f073c08d29c6e8f1d61&t=6a917c77",
  "2eeb4ebd-0d8c-4081-9675-5dad6cda46b1": "https://file.tsxyapp.com/audio/22402ea8-e3f8-4165-8be0-1ffd18bba725.mp3?v=34&sign=a5930bec501ed16c123e1051db5e46f5&t=6a917c77",
  "7346063b-2746-4e02-9b85-8e308d3f548a": "https://file.tsxyapp.com/audio/68da8719-ee10-4f6d-be70-20c6114607cf.mp3?v=34&sign=8c021841c06ffdefe626289cba01f381&t=6a917c78",
  "626940fa-f7ee-4318-8032-774cd72d0bc7": "https://file.tsxyapp.com/audio/b1494b8d-b35b-4640-a7d0-4de8ccb1dbd2.mp3?v=34&sign=4b633a08425544d752c9400810526bbf&t=6a917c78",
  "07ec4a45-1086-463a-b312-6921318e7d14": "https://file.tsxyapp.com/audio/4126a9ce-1708-40f5-8c45-f49faca44586.mp3?v=34&sign=eec485dad3cf0d39a29e7ea4305d6efc&t=6a917c78",
  "582109d4-a248-4e12-8852-8110fac7cefb": "https://file.tsxyapp.com/audio/8c300729-ec27-4435-b876-7c4f5ec5396f.mp3?v=34&sign=4dda3668e238e25729137d094c6e774d&t=6a917c78",
  "9c3d46d2-563b-4f6e-97ef-fd4c5807b507": "https://file.tsxyapp.com/audio/4ec39992-b2d7-4b94-8ea4-182e6954384b.mp3?v=34&sign=36ac885b7f16f859365193f7aa323327&t=6a917c78",
  "b2e4188e-d055-4119-9de6-c4abfa5992bd": "https://file.tsxyapp.com/audio/83f3f352-7933-437f-9dca-3c4900bbf73a.mp3?v=34&sign=a8b040651637f41d30205cf76c8720f7&t=6a917c78",
  "d7748d03-7b86-4568-941e-97c4d1ef64c2": "https://file.tsxyapp.com/audio/19ed2922-25af-417b-81da-2458326b454f.mp3?v=34&sign=becc60bfb9688334db256d2f06219a28&t=6a917c78",
  "e0a3ff09-f882-4c6f-a332-4815a84bfa7d": "https://file.tsxyapp.com/audio/9ba5d364-a617-4c08-bc06-fbd57e740706.mp3?v=34&sign=17734297cb4f3171fa43e2690604a89a&t=6a917c78",
  "63a6a353-3866-4ca7-aa46-9ea791340247": "https://file.tsxyapp.com/audio/de145f40-63a2-4c09-a350-3c2cdda48e93.mp3?v=34&sign=aa7c0f6fd0dcf23a5f44e5de9220f19d&t=6a917c78",
  "5ca6ba6b-ae9f-476d-b9f5-c23e29729394": "https://file.tsxyapp.com/audio/218c4423-9819-4ee4-a630-597ec80851b0.mp3?v=34&sign=cea36f75789380867b8a438ac497d35f&t=6a917c78",
  "12e29095-6c38-44a9-8c98-9c6c57387bfd": "https://file.tsxyapp.com/audio/890caa7e-e09c-4f64-976d-5f60efec6442.mp3?v=34&sign=4f35d632805374f6af9931fd1605168e&t=6a917c78",
  "5937bb17-0fbd-4310-a0fb-6f8ac7c2e83f": "https://file.tsxyapp.com/audio/f44644ae-9d70-448f-8663-09975404530f.mp3?v=34&sign=6c443fa52b47761ddf47e8a044f52150&t=6a917c78",
  "e998edf5-d301-40ec-8a5c-fe430538c5a2": "https://file.tsxyapp.com/audio/840d3f02-691f-4248-8270-5cb699cd01a8.mp3?v=34&sign=b19cd71c880f894e1e063e8bfecbbff9&t=6a917c78",
  "faf5742e-6f14-43d3-b26b-d630d1b47156": "https://file.tsxyapp.com/audio/c37710ec-2131-4371-841c-b1edd12a59b1.mp3?v=34&sign=821dcb536f95e01002003221e24edc9d&t=6a917c78",
  "14dc3c84-e86b-48bf-9dad-704215b8f16e": "https://file.tsxyapp.com/audio/9fa42cb8-834a-4a6f-94ec-84f8ff2fdc21.mp3?v=34&sign=911f416b16dd3132781e6bb6577ccadd&t=6a917c78",
  "d6dec68d-d57e-41a8-ba8c-ceb4f1d1c9f9": "https://file.tsxyapp.com/audio/32ba6176-f46b-4f85-84b5-2e190f79d38d.mp3?v=34&sign=68bb5a0667989dd460a9232fde6240ae&t=6a917c78",
  "8b3230c7-e896-4954-8749-625b5765def0": "https://file.tsxyapp.com/audio/f993e245-f23a-4166-96b4-89b545da3b04.mp3?v=34&sign=5a33124fed9bcb6f80c3bcb98cb0747e&t=6a917c78",
  "ff79fe56-5d7a-4343-8e9f-a5cc03fcb392": "https://file.tsxyapp.com/audio/1c8d2e38-bfca-4d3c-b9b8-3947cb11b6ea.mp3?v=34&sign=b9b53d6ed22a830603ad818cc70cf9a3&t=6a917c78",
  "6278c363-6c0b-4746-9f6f-8166116123b3": "https://file.tsxyapp.com/audio/214d0fe9-01d5-41d3-af62-5268a67589e5.mp3?v=34&sign=5ed8cb8c45b98fd6a6c094b635a3e4f1&t=6a917c78",
  "8b5695f7-b8a2-407d-8971-c2a8deb11cc1": "https://file.tsxyapp.com/audio/016ae167-eff8-45b1-ab25-d00966e0c21a.mp3?v=34&sign=4c392da7502b428d8835fb7854866159&t=6a917c78",
  "d98843c8-e89d-44ce-8f8b-655e6f5c73ed": "https://file.tsxyapp.com/audio/6a490eee-ea94-41fa-a954-801c48a4a404.mp3?v=34&sign=d05db79b3e9fe5ee4b0cf96c500d6181&t=6a917c78",
  "cb46ab50-14cc-4c22-bdf5-2dc8b807bc20": "https://file.tsxyapp.com/audio/7cc9a179-04cd-405a-b28f-1a6bb575f9bd.mp3?v=34&sign=92be17dcf8eda265f1ff46d7060927d0&t=6a917c78",
  "394d2b28-b849-4d02-be80-20a9d98552e2": "https://file.tsxyapp.com/audio/9b961647-04aa-4377-9b05-af060ea0699d.mp3?v=34&sign=40163709ac6ee57bea8ae60de5c7fe91&t=6a917c78",
  "773c2cea-0171-4487-968e-e360e217f5a0": "https://file.tsxyapp.com/audio/ac88fbac-aad8-481b-8e1d-622fd55fb0fc.mp3?v=34&sign=78aff05e63182304ddbfd53be7d2df11&t=6a917c78",
  "d6f6a651-881f-480e-bb88-c35e09313a03": "https://file.tsxyapp.com/audio/57c7ba14-fcf4-4fa9-833b-d66ea41bb30b.mp3?v=34&sign=2ce3585c885e2ac11d4674e117c193c6&t=6a917c78",
  "95da898e-9ca3-486f-8e26-a6c7f0acccf5": "https://file.tsxyapp.com/audio/20428472-89c7-40bc-90b6-67e3b845c90f.mp3?v=34&sign=3a121e3cc429c8dc9188969857903718&t=6a917c78",
  "f3a8df02-0fc6-44e1-897d-750e9f9f2f1c": "https://file.tsxyapp.com/audio/08f4aa2b-17f8-4062-8030-d29e878188c4.mp3?v=34&sign=814777f75db61961370231d8eef9524e&t=6a917c78",
  "c15318f4-d904-4ca1-aa13-c296f6780186": "https://file.tsxyapp.com/audio/e3868310-e759-49b1-ac31-38070a457bea.mp3?v=34&sign=70a8680e1c8513be4dd307e75907d281&t=6a917c78",
  "d61b14a2-4ef0-4fd6-bef4-e58dc52eb16f": "https://file.tsxyapp.com/audio/ed9414dc-fad2-4dec-a4ee-883d3cc5509e.mp3?v=34&sign=5542e4fc2b38b4ef240457666d434670&t=6a917c78",
  "6cf47732-464f-4e04-8450-453274c7939c": "https://file.tsxyapp.com/audio/ddb4ce0d-5110-41c2-81dc-7f2bf4ae2439.mp3?v=34&sign=8a01ee38f1149d5e7738221eeb4f7031&t=6a917c78",
  "1d9e8141-dc0f-4574-9354-7fb8dcc9f04e": "https://file.tsxyapp.com/audio/9f2c8749-ab7e-4857-a8e3-e6b77d97a5de.mp3?v=34&sign=b3ec3bcb386ce91e01fc18166b22a5cc&t=6a917c78",
  "3999b062-aa30-49dd-92c2-0a4420d28477": "https://file.tsxyapp.com/audio/3bedb7f4-b819-4b03-9f9b-f4c64d191f04.mp3?v=34&sign=8d17dcb2070ec93ddbc02a9109f1e405&t=6a917c78",
  "964d42bd-8c70-41c3-b37e-6790baaecbf0": "https://file.tsxyapp.com/audio/90821986-08a8-4d04-88dd-ed1db604172d.mp3?v=34&sign=b81fae39c2196c552a78167d5573eca2&t=6a917c78",
  "c463701e-6d7c-4969-9788-e4ebb50149c8": "https://file.tsxyapp.com/audio/1efce6c3-02a2-4c6e-a90f-00f49932cb67.mp3?v=34&sign=79acd6bcaaa422f4d259fdba0f6051e2&t=6a917c78",
  "a1925d29-5fdf-42a4-811d-5831812bdff6": "https://file.tsxyapp.com/audio/7e8282af-b66f-4a51-a3bc-24e0e775ec88.mp3?v=34&sign=502bd996faa3b13d1c7347b7032a0c44&t=6a917c78",
  "15c41d8c-574a-44cc-86aa-f454384545ee": "https://file.tsxyapp.com/audio/414d74de-7eb7-4be5-b1d2-9eb5c3509277.mp3?v=34&sign=fb2430537b166b21e56425a51b1b1e0f&t=6a917c78",
  "a67db420-7248-417e-b79b-69f7f0a13e7a": "https://file.tsxyapp.com/audio/8941d092-4b03-4ba5-a335-9323fe58fe47.mp3?v=34&sign=746d43d33f03360bd68af03dfecb49ae&t=6a917c78",
  "6028f8b7-bdff-46bb-877c-641ae95b97de": "https://file.tsxyapp.com/audio/64626aef-cf75-4eb0-8bae-ce0ccaaf7060.mp3?v=34&sign=e14f18699c1ee5ced6a68498bbfc4725&t=6a917c78",
  "3922c3a6-017e-46ea-8e30-dd8c273f0afb": "https://file.tsxyapp.com/audio/8adc830a-ac32-4926-a502-ac76be3a74b5.mp3?v=34&sign=5c0d5e41603871cad46421a3373071c3&t=6a917c78",
  "eddcf26b-5577-4f7a-be6d-c6d41491fb91": "https://file.tsxyapp.com/audio/62c4b6d8-55f3-4ea1-a26d-bf80bb730d8b.mp3?v=34&sign=914fd10c66d23238f48620d668ce2759&t=6a917c78",
  "d5167813-c11c-4b44-8355-3636c68a4547": "https://file.tsxyapp.com/audio/35e8593e-8570-477b-bad9-799e2c0ae053.mp3?v=34&sign=46f513d50bcf9cf489cfb942002c53e6&t=6a917c78",
  "bb8705d2-2af0-422e-b753-06706ece6ca7": "https://file.tsxyapp.com/audio/e8a65257-8cbc-4711-8d5b-7aa5b7bc7ea3.mp3?v=34&sign=4b448aa1f8befb47b45aeb85c32862a5&t=6a917c78",
  "e41bdb1a-8537-4c1a-8f59-c4ae4af1e164": "https://file.tsxyapp.com/audio/f789df93-a16c-4143-bab1-3be588a09fad.mp3?v=34&sign=e19c6565f60bbab245f77c9bfa373682&t=6a917c78",
  "690bb0ea-85c1-4e3a-a9d0-b4fb98566cd5": "https://file.tsxyapp.com/audio/817d825b-022a-44df-b21f-128cd3b2218a.mp3?v=34&sign=ec19da0bf0fc98236690a481e3350ca6&t=6a917c78",
  "dd2eb390-c300-48b7-a511-0c94948fa707": "https://file.tsxyapp.com/audio/1de1a597-bbac-425e-83d6-799eb58b4408.mp3?v=34&sign=5e8d6da48821478bbebab9d95a0624b3&t=6a917c78",
  "1f547843-2c65-49ea-9f87-99f8e40abbf7": "https://file.tsxyapp.com/audio/f8398d88-6abd-493e-9f42-84d04b4a14be.mp3?v=34&sign=a1cccfb383ab6d2d667e10d29709af79&t=6a917c78",
  "8ea203df-9bcf-4d0b-8f3f-c04cddbb6717": "https://file.tsxyapp.com/audio/5962aaed-8afa-46cb-95b7-8f8ea01e0490.mp3?v=34&sign=dcba0fe8581b58ab7effe4e54b3a5f8e&t=6a917c78",
  "95971f74-640c-4c3f-bce7-3d153efc6887": "https://file.tsxyapp.com/audio/81c6cfd8-4b70-4d4b-bf69-d34414374eb7.mp3?v=34&sign=e10322e53aaf41dd0b74592e5622f614&t=6a917c78",
  "b2fb811d-fbe2-4d27-b9b4-88a61fd22f66": "https://file.tsxyapp.com/audio/40a6ff95-f9d1-4bad-a441-5494bb558695.mp3?v=34&sign=27ade59e7b0ccd5bf8baf97b9ca75bd3&t=6a917c78",
  "39954356-db76-425b-8dc2-546d40911975": "https://file.tsxyapp.com/audio/12221a23-e85c-412e-948c-1dc0438ca35f.mp3?v=34&sign=76810af230e1af32ac58e88549df7eeb&t=6a917c78",
  "e4632ec4-32bb-4a15-9571-409a0597ee78": "https://file.tsxyapp.com/audio/8ca7fb58-7bf1-4777-a412-cbdf90629a24.mp3?v=34&sign=614eedb433ba3ed858becab52ec2758d&t=6a917c78",
  "0491a403-526b-4627-ac9e-5be65efe5c3f": "https://file.tsxyapp.com/audio/96b0fe52-faac-4b60-8524-432f41ecf149.mp3?v=34&sign=4f8accae49fb87e5191ba7e21d108409&t=6a917c78",
  "64686df8-1c38-442a-ae3a-2a9400287d16": "https://file.tsxyapp.com/audio/bb0363b2-fef3-4808-a57a-454a442f321e.mp3?v=34&sign=40b0d41c2f000b79ae8967531fc10657&t=6a917c78",
  "ad0b51cc-8eed-4c97-a8e8-93dd8f74c2fa": "https://file.tsxyapp.com/audio/e14e03cc-cc82-40a7-8400-a5fd7cf9377d.mp3?v=34&sign=938effd541881905b21d986902e9ed24&t=6a917c78",
  "78cd7f6e-d305-4ae7-980f-95d25c21498a": "https://file.tsxyapp.com/audio/184f53fc-a1f5-48f9-9f56-c3c0b440f657.mp3?v=34&sign=33f487b08d41c22fdf55e53d4696831e&t=6a917c78",
  "ceefcb98-0a1a-4f53-9a2f-d5ff2405e288": "https://file.tsxyapp.com/audio/993db2d2-bf14-4c97-ae62-59c83d8199b7.mp3?v=34&sign=0d25f7f9f9d8822bfb58770391664df6&t=6a917c78",
  "5295f65d-e08d-4b72-a6f8-088d005a03ca": "https://file.tsxyapp.com/audio/1fa217c5-4455-4f9b-ab3f-cf900abd11aa.mp3?v=34&sign=59211b4ebd1322105bffbdd9d17c902f&t=6a917c78",
  "617fb34f-16fa-4cd8-8d09-4459ef8b5052": "https://file.tsxyapp.com/audio/5da354f0-3a3a-4c56-8843-a4c6c13d8ecf.mp3?v=34&sign=5bab9dba0b8b8af8750a394518e05b97&t=6a917c78",
  "8ac64d7f-dbbb-4156-ba99-2a6f081d23cd": "https://file.tsxyapp.com/audio/319f1642-9453-460a-a86f-5d0d55456243.mp3?v=34&sign=cbb7dc6f9786232c5920623adcf6f5f9&t=6a917c78",
  "aad00de4-2925-4f07-acb7-ca0fb3609046": "https://file.tsxyapp.com/audio/c3ed6481-555d-48a9-94a0-97e2e3d4604b.mp3?v=34&sign=2ebad48a635b28912ddd5ae5bbaef0f8&t=6a917c78",
  "34a570bd-55be-4c2f-b4ee-d08fc13882e9": "https://file.tsxyapp.com/audio/12d6020f-fbd3-4846-ab66-9ffd1140c994.mp3?v=34&sign=89b405dd87510326c698bbfac5647793&t=6a917c78",
  "b8b91481-56d9-4ad1-a37a-258d03354ea8": "https://file.tsxyapp.com/audio/920e5dee-b065-48f9-9380-1f5b2e0a63a9.mp3?v=34&sign=c9ed7bd3aefab08c8e4667fdaa0b5661&t=6a917c78",
  "a60eb30e-0f5a-4e15-bfc6-b7eff7f5bf78": "https://file.tsxyapp.com/audio/01885dd5-98c6-4bdc-b89c-3ee314b7c2a0.mp3?v=34&sign=c704146acbc839f8a8c758d62c255b61&t=6a917c78",
  "38ef09a7-df6e-435f-9fbe-02faed7b57f5": "https://file.tsxyapp.com/audio/0a92e848-2c29-418b-931b-3d334e5fc6a4.mp3?v=34&sign=fe7b857591358b346e711989d7462c35&t=6a917c78",
  "e4b15c00-f7cd-4ed6-b822-2a1a6f1968f2": "https://file.tsxyapp.com/audio/f1c791be-11c4-4e8f-86c1-e1a2a883a84e.mp3?v=34&sign=94e431881ca220fbe60507d387ee0bc2&t=6a917c78",
  "3625cd94-9129-4a16-8e2a-3d15ec01bed0": "https://file.tsxyapp.com/audio/a323ba80-cb7b-49c5-8b27-d4b99bdc34fb.mp3?v=34&sign=7ac088ad1fbc59f0eadb1fe2bed100ca&t=6a917c78",
  "6ef9afab-2680-4ada-a432-232e4b725093": "https://file.tsxyapp.com/audio/c11a0186-243c-4ec5-812c-daca8904617e.mp3?v=34&sign=e4be6431d7235b9b2b3622d3ea8f20db&t=6a917c78",
  "cb5285d6-0a2b-4f2e-a204-fed7dbb39f63": "https://file.tsxyapp.com/audio/0a2120e3-9f2f-40b9-8ada-59e8903c23ea.mp3?v=34&sign=c63b99ffc1e0436a320aeceefb48ac4b&t=6a917c78",
  "a2273994-ecad-4fac-9f02-9271bf0e36aa": "https://file.tsxyapp.com/audio/b8875685-0fbc-436f-9d2f-a6951bf131f9.mp3?v=34&sign=cff14bfaaf83ef25aef16d388e4f7c5e&t=6a917c78",
  "1fd30edb-0229-4be6-8d5b-23834860ae0f": "https://file.tsxyapp.com/audio/1370f577-e512-4fe7-9a1f-05385265f151.mp3?v=34&sign=4bee2e675ae0f178e82ef3c3c9d3c7c1&t=6a917c78",
  "40e133ba-d216-4eb1-9e27-f38e2af286da": "https://file.tsxyapp.com/audio/bed276ba-4354-475e-875d-9667b0767ae5.mp3?v=34&sign=b22997a64c1313d335695eb5d135992e&t=6a917c78",
  "883b492e-854a-4ade-bb94-8360ab72dc59": "https://file.tsxyapp.com/audio/56f99739-3599-419f-9158-015635636935.mp3?v=34&sign=313c6e5efb32231b7852a043b8c689d4&t=6a917c78",
  "d02b5a36-708d-48aa-ba72-b654bf6b283d": "https://file.tsxyapp.com/audio/fdd58d0f-a2af-4627-9659-6d86488017be.mp3?v=34&sign=db9228c29b84f40d61691042d714602d&t=6a917c78",
  "c9e151e8-8d3c-4014-a7a7-6b043128684e": "https://file.tsxyapp.com/audio/8a01192b-7ea4-40fe-a4ea-225a5f158dac.mp3?v=34&sign=b014adbdd21861f6073bd01c78eb56c4&t=6a917c78",
  "a0d195b8-3e0d-43e6-9cdd-c54d0ef0e2a3": "https://file.tsxyapp.com/audio/358780d6-62d7-4985-9d16-cb2748944ef3.mp3?v=34&sign=3fdb1958148672d9bf97fb36845ca14b&t=6a917c78",
  "a2441083-2d1d-4d7d-b779-fa2ead10eb8a": "https://file.tsxyapp.com/audio/bd5ebf7c-3329-4f5c-b27b-57db69674f31.mp3?v=34&sign=21aeca23e6ffe1de20de55ad87c2fb35&t=6a917c78",
  "4d03fe84-5c36-4dc0-957f-d19291f7b8de": "https://file.tsxyapp.com/audio/a74a3bb0-bfde-4608-863c-f7351cb23c94.mp3?v=34&sign=8ec1b2a782f9529f1d57c374b5fe079b&t=6a917c78",
  "ec2870af-5a57-464a-9b49-59b259de97f6": "https://file.tsxyapp.com/audio/873e91a2-64e8-4b63-8118-12ebce5996ef.mp3?v=34&sign=d2d718b2a773b6feece6fee23ec0b1e1&t=6a917c78",
  "cd041c0f-c870-4680-8bb2-77a92e3dd63b": "https://file.tsxyapp.com/audio/5a575787-dfa3-40a5-9aa1-5247ea9cb12a.mp3?v=34&sign=136d56dfc8d8e25e6c7912f7f7d41f56&t=6a917c78",
  "2322806d-779c-49a6-9fff-9ceb9583598a": "https://file.tsxyapp.com/audio/1fdcd8a8-7df2-419b-9792-df293b5531be.mp3?v=34&sign=517703cf8edde2ae13bbf75eaad72450&t=6a917c78",
  "3a65dc75-5062-4bf8-a936-85ea221bb012": "https://file.tsxyapp.com/audio/d25bc360-db0c-40c2-8c0c-06a34682dff7.mp3?v=34&sign=c40cb67f6cdfdb9ad0403c07bf29cc84&t=6a917c78",
  "cb9b3277-e9a7-42d9-81fc-25d7555dda53": "https://file.tsxyapp.com/audio/83982e84-061e-4473-a62a-6f74adc0584a.mp3?v=34&sign=614e8b390b59add30c18570e4256feaf&t=6a917c78",
  "f7ae974a-3205-401c-a4c6-cf2bff3d1275": "https://file.tsxyapp.com/audio/a84fbc8d-c0e5-4a3c-9dc7-5f82512cc3c8.mp3?v=34&sign=96b907b3576f2d4cf34b05a39dae1361&t=6a917c78",
  "7ddd7e2a-8846-4ec6-840e-24ff3e0ff501": "https://file.tsxyapp.com/audio/f3300bac-0667-4adf-bbd2-ced04fdb056d.mp3?v=34&sign=60508b801df3633dbb81eed61ea3964a&t=6a917c78",
  "5aaba143-50fa-43c7-9359-dbf8db47f376": "https://file.tsxyapp.com/audio/43e7196f-f2fd-4f54-9ff5-af3c1643f5f2.mp3?v=34&sign=51d4ade79fbe833d8e3a54d5056b06a7&t=6a917c78",
  "b0d5d38a-366e-446c-84de-c5cf19e23047": "https://file.tsxyapp.com/audio/330ad9e7-6ae7-450f-bfc9-a866574eb0f4.mp3?v=34&sign=32f244f284a662b27e91f70b8459159f&t=6a917c78",
  "7c4acedf-6c48-4e7f-8be9-ffe91044e3e6": "https://file.tsxyapp.com/audio/fbfd30b7-f1e5-49c3-bcee-097e800a4a0c.mp3?v=34&sign=8fc51b005ad12a1f1b510375dd0d589e&t=6a917c78",
  "96627637-b6f3-441d-8dcb-0f3042dc4e53": "https://file.tsxyapp.com/audio/81306d25-be96-4fcc-bc9c-2666cd28cff7.mp3?v=34&sign=08f7dbfa6eb1c8772de9e7bcd00afd45&t=6a917c78",
  "94ae19e4-b901-460a-8dc7-ba5ed57a6733": "https://file.tsxyapp.com/audio/8203122a-04c3-4d8c-8d17-e509ddc875ae.mp3?v=34&sign=8743a140f912f1a27dfd2250ddca856a&t=6a917c78",
  "0ea9fac6-8305-461a-a5ed-f02a63411b79": "https://file.tsxyapp.com/audio/63922467-657d-4d97-b45d-2a6243f84ff9.mp3?v=34&sign=becfac3f362f8af53770c1fb9ddbf8eb&t=6a917c78",
  "fb453ceb-fa76-41d8-a431-73b2ea13bad9": "https://file.tsxyapp.com/audio/eb910bab-0cf9-4fff-8301-55bfc679878e.mp3?v=34&sign=05ea3604eddce2f69814744e47cc4cfe&t=6a917c78",
  "d82b989b-d303-401a-80b5-988e2538ca5e": "https://file.tsxyapp.com/audio/3ca67da5-466f-4fff-8390-4874286d27c4.mp3?v=34&sign=5c9100db8bc1dd5face347cca5a37d85&t=6a917c78",
  "5e142a17-bcdf-484e-a0f2-9a9beda241c5": "https://file.tsxyapp.com/audio/346cf4d9-d91e-4fdd-acdd-a2182bd30547.mp3?v=34&sign=54ab49979d27db79abc8c781020ad9da&t=6a917c78",
  "45308bc1-0f6c-4746-9b00-d824d524cb6e": "https://file.tsxyapp.com/audio/c08b82aa-215f-4eda-935a-d3e4dea1d60a.mp3?v=34&sign=e8adec572320fc8dc200fe1751ea9124&t=6a917c78",
  "1d052901-35dd-49ec-bbfc-e563bec9019b": "https://file.tsxyapp.com/audio/0f5f38da-59f6-4ba7-8902-d919c5227a1f.mp3?v=34&sign=57f6dfc380cff26cf3c92b9f66ab8e0b&t=6a917c78",
  "1bb0f9b0-9dd0-478d-a757-e52173884923": "https://file.tsxyapp.com/audio/b474fb71-74f6-4765-850d-1d73bd4bc356.mp3?v=34&sign=160af754111949c44a3e3ba3ba4c1338&t=6a917c78",
  "f062a825-acc9-4151-9df2-9fc6888c9e16": "https://file.tsxyapp.com/audio/7f094d4f-923e-4ee3-99b1-a3ce71295f50.mp3?v=34&sign=d39298b37b835ada24c397b67752ac35&t=6a917c78",
  "aae41bf0-e834-4193-b01b-5946bdf14d86": "https://file.tsxyapp.com/audio/313657d7-d402-4d1c-8874-55270ea21d4b.mp3?v=34&sign=cc983593afe72c1f774413ad352ae15c&t=6a917c78",
  "c492bb38-2666-4acf-9474-afb7d5bf7bda": "https://file.tsxyapp.com/audio/89f255a4-486a-4300-a8c8-a5ab1b3024d1.mp3?v=34&sign=c5fdc0d77e3c18bc9df93b23f819c5cc&t=6a917c78",
  "372158f7-b7b9-41de-90ea-f9306a2165d0": "https://file.tsxyapp.com/audio/c37263fc-903d-4006-94ea-cb37c5047322.mp3?v=34&sign=c0d06c8d1d6a612b5d0896c5c138bf98&t=6a917c78",
  "ba554abf-045d-487b-b384-fdd3fdda0317": "https://file.tsxyapp.com/audio/fc89e5bf-48e2-4eea-a595-16eba1e67a2e.mp3?v=34&sign=436097fd9dcecdd3fb625d1b3d81cbb6&t=6a917c77",
  "70d68664-08e9-44d6-94f6-aea95b5fb068": "https://file.tsxyapp.com/audio/b43c3cd9-b454-4361-a5da-481c3f4cc21d.mp3?v=34&sign=cb60882cb0ed37aa7ddc89ba60dc0632&t=6a917c77",
  "b9789c8f-533c-4b00-8ca7-f48ad5812d19": "https://file.tsxyapp.com/audio/0ffa6374-197a-477b-b88a-d930d3cb7749.mp3?v=34&sign=8d19ce39fb990f7149f6b56f40652173&t=6a917c77",
  "95891a46-894b-4d73-84e1-55c1a8abcf7e": "https://file.tsxyapp.com/audio/e0ad4009-c599-469b-aa7a-3382cf0acfc9.mp3?v=34&sign=67d2583fc45fab3ae01be6df1c56b8af&t=6a917c77",
  "d783f3d9-825d-4f81-b851-021c423cec40": "https://file.tsxyapp.com/audio/beec6aa7-75e3-437c-8209-e2841ba2410c.mp3?v=34&sign=11d709819a46ebf98bed34a239a130b3&t=6a917c77",
  "05e67041-1c47-449c-9f17-83362e79dfcb": "https://file.tsxyapp.com/audio/07e4629c-359f-4282-8a1d-7544d92562d0.mp3?v=34&sign=babe32ee3efb8bec0e4f755a52746481&t=6a917c77",
  "1d757661-99cc-4cc8-ae48-3097a668adbc": "https://file.tsxyapp.com/audio/6fde65d4-c154-40f5-9db9-030b0410da8e.mp3?v=34&sign=32a343c13fbfb66d893a82e4372b7782&t=6a917c77",
  "6b791c82-4660-4946-b031-f220ee352ce4": "https://file.tsxyapp.com/audio/07898d23-c6a4-4c15-a9ba-3eec4628c320.mp3?v=34&sign=1863fa2e8770aae2833a7ec14610aee9&t=6a917c77",
  "282e44df-29ee-47fc-8708-7aaa0a2a7193": "https://file.tsxyapp.com/audio/64c0ae12-fae4-4267-93f7-669ee0c779a7.mp3?v=34&sign=b87c4016c7e69d835cee0cbe5d4b3cb1&t=6a917c77",
  "41dffe6b-d5c7-4806-a234-dce31057dd69": "https://file.tsxyapp.com/audio/fe79adba-940c-4aad-b8de-713d053134cd.mp3?v=34&sign=6b5e55aea0a7cbbe7a20cd19de2d2737&t=6a917c77",
  "6eee358a-304e-4a33-8bfe-045618987718": "https://file.tsxyapp.com/audio/6f8ef29b-ff14-4312-83b5-6c6625333736.mp3?v=34&sign=de37e148620c5070e2d7e5868b43a255&t=6a917c77",
  "a6bd9cda-1ba2-4026-950a-cb593d384bd5": "https://file.tsxyapp.com/audio/2973c95e-7f7d-480f-a759-f7c5c76ba172.mp3?v=34&sign=a32f52b9f0862b490aa1f6be514ff2db&t=6a917c77",
  "e51282e7-34fb-4da5-853d-8c879ed43a24": "https://file.tsxyapp.com/audio/4d27c117-fe62-493f-bd10-a0328c0c730f.mp3?v=34&sign=df45f35e2ed91dbe26dfd6c80ce5298f&t=6a917c77",
  "5cabcb61-8e43-4d93-8b62-668ef246b8bf": "https://file.tsxyapp.com/audio/623b2d27-69ec-4195-a519-e6a40eb6a8ec.mp3?v=34&sign=813b2317650a1265d79d32185a56f0d5&t=6a917c77",
  "ba0eed9c-a1d0-4496-b77c-d0b9bd04407d": "https://file.tsxyapp.com/audio/3b653987-0eb4-41d4-b0eb-c7b4500f3a03.mp3?v=34&sign=69b9752a95a409ec56f03d15d68258aa&t=6a917c77",
  "191bec2e-bd50-4567-be34-72b2abaaa0e3": "https://file.tsxyapp.com/audio/3a5f8af1-848a-49a0-92fe-27fad6f90275.mp3?v=34&sign=79bbcb136c207fc45a1358d60cbab117&t=6a917c77",
  "0caab7cf-49d0-4d2a-acd2-d396cf0b2684": "https://file.tsxyapp.com/audio/d1804a65-88b0-420c-a89e-a50f52baf807.mp3?v=34&sign=62cd104ab9297fbb8734b818bf611e2b&t=6a917c77",
  "db89fa90-3336-4af1-89e7-05cec2e9f6a4": "https://file.tsxyapp.com/audio/0839cde8-f779-45ea-b979-c3edf95601f9.mp3?v=34&sign=75e45c47cf44945a2b1a39eca9155f75&t=6a917c77"
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

  // 动态按需查询 (仅针对未来发布、不在内置种子库中的新课程)
  function fetchCourseAudioOnDemand(record, payload) {
    var authorization = requestHeader("authorization");
    if (!/^Bearer\s+\S+/i.test(authorization)) {
      $done({ body: buildMediaSuccessBody(payload, record) });
      return;
    }

    var sessionId = getSessionIdFromToken(authorization);
    var lookupUrl = ADMIN_COURSE_LIST + "?page=1" + (sessionId ? ("&sessionId=" + sessionId) : "");

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
          // 写入动态缓存
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

  // 2. 视频课程详情阶段：优先从内置种子映射或本地动态持久化缓存秒读
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
