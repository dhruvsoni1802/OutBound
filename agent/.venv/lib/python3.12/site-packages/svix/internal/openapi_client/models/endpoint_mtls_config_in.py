from typing import Any, Dict, List, Type, TypeVar

import attr

T = TypeVar("T", bound="EndpointMtlsConfigIn")


@attr.s(auto_attribs=True)
class EndpointMtlsConfigIn:
    """
    Attributes:
        ca_cert (str): A PEM encoded X509 certificate used to verify the webhook receiver's certificate.
        identity (str): A PEM encoded private key and X509 certificate to identify the webhook sender.
    """

    ca_cert: str
    identity: str
    additional_properties: Dict[str, Any] = attr.ib(init=False, factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        ca_cert = self.ca_cert
        identity = self.identity

        field_dict: Dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "caCert": ca_cert,
                "identity": identity,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        ca_cert = d.pop("caCert")

        identity = d.pop("identity")

        endpoint_mtls_config_in = cls(
            ca_cert=ca_cert,
            identity=identity,
        )

        endpoint_mtls_config_in.additional_properties = d
        return endpoint_mtls_config_in

    @property
    def additional_keys(self) -> List[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
